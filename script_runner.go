package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

type ScriptRunner struct {
	app *App
}

func NewScriptRunner(app *App) *ScriptRunner {
	return &ScriptRunner{app: app}
}

type PMContext struct {
	request     *HttpRequest
	response    *HttpResponse
	environment *Environment
	tests       []TestResult
	console     []string
	variables   map[string]interface{}
}

func (sr *ScriptRunner) RunPreRequestScript(req *HttpRequest) (*ScriptResult, error) {
	if req.Scripts == nil || req.Scripts.PreRequest == "" {
		return nil, nil
	}

	vm := goja.New()
	result := &ScriptResult{
		ConsoleOutput: []string{},
		Tests:         []TestResult{},
	}

	ctx := &PMContext{
		request:   req,
		tests:     []TestResult{},
		console:   []string{},
		variables: make(map[string]interface{}),
	}

	activeEnvId := sr.app.GetActiveEnvironment()
	if activeEnvId != "" {
		ctx.environment = sr.app.environmentStorage.GetEnvironment(activeEnvId)
	}

	sr.setupPMObject(vm, ctx, true)

	_, err := vm.RunString(req.Scripts.PreRequest)
	if err != nil {
		result.Error = fmt.Sprintf("Pre-request script error: %v", err)
		return result, err
	}

	result.ConsoleOutput = ctx.console
	result.Tests = ctx.tests

	if ctx.environment != nil {
		err = sr.app.environmentStorage.SaveEnvironment(*ctx.environment)
		if err != nil {
			result.ConsoleOutput = append(result.ConsoleOutput, fmt.Sprintf("Warning: Failed to save environment: %v", err))
		}
	}

	for key, value := range ctx.variables {
		switch key {
		case "url":
			if strVal, ok := value.(string); ok {
				req.URL = strVal
			}
		}
	}

	return result, nil
}

func (sr *ScriptRunner) RunPostRequestScript(req *HttpRequest, resp *HttpResponse) (*ScriptResult, error) {
	if req.Scripts == nil || req.Scripts.PostRequest == "" {
		return nil, nil
	}

	vm := goja.New()
	result := &ScriptResult{
		ConsoleOutput: []string{},
		Tests:         []TestResult{},
	}

	ctx := &PMContext{
		request:   req,
		response:  resp,
		tests:     []TestResult{},
		console:   []string{},
		variables: make(map[string]interface{}),
	}

	activeEnvId := sr.app.GetActiveEnvironment()
	if activeEnvId != "" {
		ctx.environment = sr.app.environmentStorage.GetEnvironment(activeEnvId)
	}

	sr.setupPMObject(vm, ctx, false)

	_, err := vm.RunString(req.Scripts.PostRequest)
	if err != nil {
		result.Error = fmt.Sprintf("Post-request script error: %v", err)
		return result, err
	}

	result.ConsoleOutput = ctx.console
	result.Tests = ctx.tests

	if ctx.environment != nil {
		err = sr.app.environmentStorage.SaveEnvironment(*ctx.environment)
		if err != nil {
			result.ConsoleOutput = append(result.ConsoleOutput, fmt.Sprintf("Warning: Failed to save environment: %v", err))
		}
	}

	return result, nil
}

func (sr *ScriptRunner) setupPMObject(vm *goja.Runtime, ctx *PMContext, isPreRequest bool) {
	pm := vm.NewObject()

	consoleObj := vm.NewObject()
	consoleObj.Set("log", func(call goja.FunctionCall) goja.Value {
		args := make([]string, len(call.Arguments))
		for i, arg := range call.Arguments {
			args[i] = fmt.Sprintf("%v", arg)
		}
		message := strings.Join(args, " ")
		ctx.console = append(ctx.console, message)
		return goja.Undefined()
	})
	vm.Set("console", consoleObj)

	environment := vm.NewObject()
	environment.Set("get", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Null()
		}
		key := call.Arguments[0].String()
		if ctx.environment != nil {
			if value, ok := ctx.environment.Variables[key]; ok {
				return vm.ToValue(value)
			}
		}
		return goja.Null()
	})
	environment.Set("set", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return goja.Undefined()
		}
		key := call.Arguments[0].String()
		value := call.Arguments[1].String()

		if ctx.environment == nil {
			activeEnvId := sr.app.GetActiveEnvironment()
			if activeEnvId != "" {
				env := sr.app.environmentStorage.GetEnvironment(activeEnvId)
				if env != nil {
					ctx.environment = env
				}
			}
		}

		if ctx.environment != nil {
			ctx.environment.Variables[key] = value
		}

		return goja.Undefined()
	})
	pm.Set("environment", environment)

	pm.Set("test", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return goja.Undefined()
		}
		testName := call.Arguments[0].String()
		testFunc := call.Arguments[1]

		result := TestResult{
			Name:   testName,
			Passed: false,
		}

		if callable, ok := goja.AssertFunction(testFunc); ok {
			_, err := callable(goja.Undefined())
			if err != nil {
				result.Error = err.Error()
			} else {
				result.Passed = true
			}
		}

		ctx.tests = append(ctx.tests, result)
		return goja.Undefined()
	})

	if !isPreRequest && ctx.response != nil {
		response := vm.NewObject()

		response.Set("code", ctx.response.Status)
		response.Set("status", ctx.response.StatusText)
		response.Set("headers", ctx.response.Headers)
		response.Set("responseTime", ctx.response.Time)
		response.Set("responseSize", ctx.response.Size)

		response.Set("text", func(call goja.FunctionCall) goja.Value {
			return vm.ToValue(ctx.response.Body)
		})

		response.Set("json", func(call goja.FunctionCall) goja.Value {
			var data interface{}
			err := json.Unmarshal([]byte(ctx.response.Body), &data)
			if err != nil {
				panic(vm.NewGoError(fmt.Errorf("Failed to parse JSON: %w", err)))
			}
			return vm.ToValue(data)
		})

		pm.Set("response", response)

		expect := vm.NewObject()
		expect.Set("to", func(call goja.FunctionCall) goja.Value {
			toObj := vm.NewObject()

			toObj.Set("equal", func(call goja.FunctionCall) goja.Value {
				if len(call.Arguments) < 1 {
					panic(vm.NewGoError(fmt.Errorf("expect requires an argument")))
				}
				return goja.Undefined()
			})

			toObj.Set("eql", func(call goja.FunctionCall) goja.Value {
				if len(call.Arguments) < 1 {
					panic(vm.NewGoError(fmt.Errorf("expect requires an argument")))
				}
				return goja.Undefined()
			})

			toObj.Set("have", func(call goja.FunctionCall) goja.Value {
				haveObj := vm.NewObject()
				haveObj.Set("status", func(call goja.FunctionCall) goja.Value {
					if len(call.Arguments) < 1 {
						panic(vm.NewGoError(fmt.Errorf("status requires an argument")))
					}
					expectedStatus := int(call.Arguments[0].ToInteger())
					if ctx.response.Status != expectedStatus {
						panic(vm.NewGoError(fmt.Errorf("Expected status %d but got %d", expectedStatus, ctx.response.Status)))
					}
					return goja.Undefined()
				})
				return haveObj
			})

			return toObj
		})

		vm.Set("pm", pm)
		vm.Set("expect", func(call goja.FunctionCall) goja.Value {
			return expect
		})
	} else {
		vm.Set("pm", pm)
	}

	request := vm.NewObject()
	request.Set("url", ctx.request.URL)
	request.Set("method", string(ctx.request.Method))

	headersMap := make(map[string]string)
	for _, h := range ctx.request.Headers {
		if h.Enabled {
			headersMap[h.Key] = h.Value
		}
	}
	request.Set("headers", headersMap)

	pm.Set("request", request)

	pm.Set("variables", vm.NewObject())
	pm.Get("variables").ToObject(vm).Set("set", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return goja.Undefined()
		}
		key := call.Arguments[0].String()
		value := call.Arguments[1].Export()
		ctx.variables[key] = value
		return goja.Undefined()
	})
	pm.Get("variables").ToObject(vm).Set("get", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Null()
		}
		key := call.Arguments[0].String()
		if val, ok := ctx.variables[key]; ok {
			return vm.ToValue(val)
		}
		return goja.Null()
	})
}
