package main

import (
	"fmt"
	"time"
)

type CollectionRunResult struct {
	ProjectId    string                  `json:"projectId"`
	ProjectName  string                  `json:"projectName"`
	StartTime    time.Time               `json:"startTime"`
	EndTime      time.Time               `json:"endTime"`
	Duration     int64                   `json:"duration"`
	TotalTests   int                     `json:"totalTests"`
	PassedTests  int                     `json:"passedTests"`
	FailedTests  int                     `json:"failedTests"`
	RequestResults []RequestRunResult    `json:"requestResults"`
}

type RequestRunResult struct {
	RequestId    string        `json:"requestId"`
	RequestName  string        `json:"requestName"`
	Method       string        `json:"method"`
	URL          string        `json:"url"`
	Status       int           `json:"status"`
	StatusText   string        `json:"statusText"`
	Duration     int64         `json:"duration"`
	Success      bool          `json:"success"`
	Error        string        `json:"error,omitempty"`
	Tests        []TestResult  `json:"tests,omitempty"`
	PassedTests  int           `json:"passedTests"`
	FailedTests  int           `json:"failedTests"`
}

func (a *App) RunCollection(projectId string) (*CollectionRunResult, error) {
	project := a.projectStorage.GetProject(projectId)
	if project == nil {
		return nil, fmt.Errorf("项目未找到: %s", projectId)
	}

	requests := a.requestStorage.GetProjectRequests(projectId)
	if len(requests) == 0 {
		return nil, fmt.Errorf("项目中没有请求")
	}

	result := &CollectionRunResult{
		ProjectId:      projectId,
		ProjectName:    project.Name,
		StartTime:      time.Now(),
		RequestResults: []RequestRunResult{},
	}

	for _, req := range requests {
		reqResult := a.runSingleRequest(req)
		result.RequestResults = append(result.RequestResults, reqResult)
		
		result.TotalTests += len(reqResult.Tests)
		result.PassedTests += reqResult.PassedTests
		result.FailedTests += reqResult.FailedTests
	}

	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime).Milliseconds()

	return result, nil
}

func (a *App) runSingleRequest(req HttpRequest) RequestRunResult {
	startTime := time.Now()
	
	reqResult := RequestRunResult{
		RequestId:   req.ID,
		RequestName: req.Name,
		Method:      string(req.Method),
		URL:         req.URL,
		Success:     false,
		Tests:       []TestResult{},
	}

	resp, err := a.SendRequest(req)
	duration := time.Since(startTime).Milliseconds()
	reqResult.Duration = duration

	if err != nil {
		reqResult.Error = err.Error()
		reqResult.Success = false
		return reqResult
	}

	reqResult.Status = resp.Status
	reqResult.StatusText = resp.StatusText
	reqResult.Success = resp.Status >= 200 && resp.Status < 300

	if resp.ScriptResult != nil && resp.ScriptResult.Tests != nil {
		reqResult.Tests = resp.ScriptResult.Tests
		for _, test := range resp.ScriptResult.Tests {
			if test.Passed {
				reqResult.PassedTests++
			} else {
				reqResult.FailedTests++
			}
		}
	}

	return reqResult
}
