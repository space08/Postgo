package main

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"time"

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

		vm.Set("pm", pm)
		vm.Set("expect", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(vm.NewGoError(fmt.Errorf("expect requires an argument")))
			}
			return buildExpectObject(vm, call.Arguments[0])
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

	headers := vm.NewObject()
	headers.Set("save", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 3 {
			ctx.console = append(ctx.console, "pm.headers.save requires 3 arguments: (name, headerKey, value)")
			return goja.Undefined()
		}

		// Check if any argument is undefined or null
		for i, arg := range call.Arguments {
			if goja.IsUndefined(arg) || goja.IsNull(arg) {
				ctx.console = append(ctx.console, fmt.Sprintf("pm.headers.save: argument %d is undefined or null, skipping save", i+1))
				return goja.Undefined()
			}
		}

		name := call.Arguments[0].String()
		headerKey := call.Arguments[1].String()
		value := call.Arguments[2].String()

		// Additional validation
		if value == "" || value == "undefined" || value == "null" {
			ctx.console = append(ctx.console, fmt.Sprintf("pm.headers.save: invalid value '%s', skipping save", value))
			return goja.Undefined()
		}

		header := Header{
			ID:        fmt.Sprintf("header-%d", time.Now().UnixNano()),
			Name:      name,
			HeaderKey: headerKey,
			Value:     value,
		}

		err := sr.app.headerStorage.SaveHeader(header)
		if err != nil {
			ctx.console = append(ctx.console, fmt.Sprintf("Failed to save header: %v", err))
		} else {
			ctx.console = append(ctx.console, fmt.Sprintf("Saved header '%s' (%s: %s...)", name, headerKey, value[:min(20, len(value))]))
		}

		return goja.Undefined()
	})
	pm.Set("headers", headers)
}

func buildExpectObject(vm *goja.Runtime, actual goja.Value) *goja.Object {
	expectObj := vm.NewObject()
	toObj := vm.NewObject()
	populateAssertionObject(vm, toObj, actual, false, true)
	expectObj.Set("to", toObj)
	return expectObj
}

func populateAssertionObject(vm *goja.Runtime, obj *goja.Object, actual goja.Value, negate bool, includeNot bool) {
	obj.Set("equal", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 1 {
			panic(vm.NewGoError(fmt.Errorf("equal requires an argument")))
		}
		ok := actual.StrictEquals(call.Arguments[0])
		assertScriptCondition(vm, ok, negate, "Expected %s to equal %s", actual.String(), call.Arguments[0].String())
		return goja.Undefined()
	})

	obj.Set("eql", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 1 {
			panic(vm.NewGoError(fmt.Errorf("eql requires an argument")))
		}
		ok := reflect.DeepEqual(actual.Export(), call.Arguments[0].Export())
		assertScriptCondition(vm, ok, negate, "Expected %s to deeply equal %s", actual.String(), call.Arguments[0].String())
		return goja.Undefined()
	})

	haveObj := vm.NewObject()
	haveObj.Set("status", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 1 {
			panic(vm.NewGoError(fmt.Errorf("status requires an argument")))
		}
		actualStatus, ok := statusFromValue(vm, actual)
		if !ok {
			panic(vm.NewGoError(fmt.Errorf("Expected value to have a status code")))
		}
		expectedStatus := int(call.Arguments[0].ToInteger())
		assertScriptCondition(vm, actualStatus == expectedStatus, negate, "Expected status %d but got %d", expectedStatus, actualStatus)
		return goja.Undefined()
	})
	obj.Set("have", haveObj)

	beObj := vm.NewObject()
	defineUndefinedAssertion(vm, beObj, actual, negate)
	obj.Set("be", beObj)

	if includeNot {
		notObj := vm.NewObject()
		populateAssertionObject(vm, notObj, actual, !negate, false)
		obj.Set("not", notObj)
	}
}

func defineUndefinedAssertion(vm *goja.Runtime, obj *goja.Object, actual goja.Value, negate bool) {
	getter := vm.ToValue(func() goja.Value {
		assertScriptCondition(vm, goja.IsUndefined(actual), negate, "Expected value to be undefined")
		return goja.Undefined()
	})
	_ = obj.DefineAccessorProperty("undefined", getter, nil, goja.FLAG_TRUE, goja.FLAG_TRUE)
}

func statusFromValue(vm *goja.Runtime, value goja.Value) (int, bool) {
	if goja.IsUndefined(value) || goja.IsNull(value) {
		return 0, false
	}

	if obj, ok := value.(*goja.Object); ok {
		code := obj.Get("code")
		if !goja.IsUndefined(code) && !goja.IsNull(code) {
			return int(code.ToInteger()), true
		}
	}

	return int(value.ToInteger()), true
}

func assertScriptCondition(vm *goja.Runtime, ok bool, negate bool, format string, args ...interface{}) {
	if negate {
		ok = !ok
	}
	if !ok {
		panic(vm.NewGoError(fmt.Errorf(format, args...)))
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
