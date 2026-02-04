package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

type Logger struct {
	level      LogLevel
	fileLogger *log.Logger
	file       *os.File
}

var globalLogger *Logger

func InitLogger(level LogLevel) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	logDir := filepath.Join(homeDir, ".postgo", "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	logFile := filepath.Join(logDir, fmt.Sprintf("postgo_%s.log", time.Now().Format("2006-01-02")))
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	globalLogger = &Logger{
		level:      level,
		fileLogger: log.New(file, "", log.LstdFlags),
		file:       file,
	}

	return nil
}

func CloseLogger() {
	if globalLogger != nil && globalLogger.file != nil {
		globalLogger.file.Close()
	}
}

func (l *Logger) log(level LogLevel, format string, args ...interface{}) {
	if l == nil || level < l.level {
		return
	}

	levelStr := ""
	switch level {
	case DEBUG:
		levelStr = "[DEBUG]"
	case INFO:
		levelStr = "[INFO]"
	case WARN:
		levelStr = "[WARN]"
	case ERROR:
		levelStr = "[ERROR]"
	}

	message := fmt.Sprintf(format, args...)
	l.fileLogger.Printf("%s %s", levelStr, message)

	if level >= ERROR {
		fmt.Fprintf(os.Stderr, "%s %s %s\n", time.Now().Format("2006/01/02 15:04:05"), levelStr, message)
	}
}

func LogDebug(format string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.log(DEBUG, format, args...)
	}
}

func LogInfo(format string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.log(INFO, format, args...)
	}
}

func LogWarn(format string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.log(WARN, format, args...)
	}
}

func LogError(format string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.log(ERROR, format, args...)
	}
}
