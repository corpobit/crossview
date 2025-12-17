package lib

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"go.uber.org/fx/fxevent"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	gormlogger "gorm.io/gorm/logger"
)

// Logger structure
type Logger struct {
	*zap.SugaredLogger
}

type GinLogger struct {
	*Logger
}

type FxLogger struct {
	*Logger
}

type GormLogger struct {
	*Logger
	gormlogger.Config
}

var (
	globalLogger *Logger
	zapLogger    *zap.Logger
	loggerOnce   sync.Once
	loggerMu     sync.RWMutex
)

// GetLogger get the logger
func GetLogger() Logger {
	loggerOnce.Do(func() {
		logger := newLogger(NewEnv())
		globalLogger = &logger
	})
	return *globalLogger
}

// GetGinLogger get the gin logger
func (l Logger) GetGinLogger() GinLogger {
	loggerMu.RLock()
	defer loggerMu.RUnlock()
	
	if zapLogger == nil {
		tempLogger, _ := zap.NewDevelopment()
		logger := tempLogger.WithOptions(zap.WithCaller(false))
		return GinLogger{
			Logger: newSugaredLogger(logger),
		}
	}
	
	logger := zapLogger.WithOptions(
		zap.WithCaller(false),
	)
	return GinLogger{
		Logger: newSugaredLogger(logger),
	}
}

// GetFxLogger gets logger for go-fx
func (l *Logger) GetFxLogger() fxevent.Logger {
	loggerMu.RLock()
	defer loggerMu.RUnlock()
	
	if zapLogger == nil {
		tempLogger, _ := zap.NewDevelopment()
		logger := tempLogger.WithOptions(zap.WithCaller(false))
		return &FxLogger{Logger: newSugaredLogger(logger)}
	}
	
	logger := zapLogger.WithOptions(
		zap.WithCaller(false),
	)
	return &FxLogger{Logger: newSugaredLogger(logger)}
}

// LogEvent log event for fx logger
func (l *FxLogger) LogEvent(event fxevent.Event) {
	switch e := event.(type) {
	case *fxevent.OnStartExecuting:
		l.Logger.Debug("OnStart hook executing: ",
			zap.String("callee", e.FunctionName),
			zap.String("caller", e.CallerName),
		)
	case *fxevent.OnStartExecuted:
		if e.Err != nil {
			l.Logger.Debug("OnStart hook failed: ",
				zap.String("callee", e.FunctionName),
				zap.String("caller", e.CallerName),
				zap.Error(e.Err),
			)
		} else {
			l.Logger.Debug("OnStart hook executed: ",
				zap.String("callee", e.FunctionName),
				zap.String("caller", e.CallerName),
				zap.String("runtime", e.Runtime.String()),
			)
		}
	case *fxevent.OnStopExecuting:
		l.Logger.Debug("OnStop hook executing: ",
			zap.String("callee", e.FunctionName),
			zap.String("caller", e.CallerName),
		)
	case *fxevent.OnStopExecuted:
		if e.Err != nil {
			l.Logger.Debug("OnStop hook failed: ",
				zap.String("callee", e.FunctionName),
				zap.String("caller", e.CallerName),
				zap.Error(e.Err),
			)
		} else {
			l.Logger.Debug("OnStop hook executed: ",
				zap.String("callee", e.FunctionName),
				zap.String("caller", e.CallerName),
				zap.String("runtime", e.Runtime.String()),
			)
		}
	case *fxevent.Supplied:
		l.Logger.Debug("supplied: ", zap.String("type", e.TypeName), zap.Error(e.Err))
	case *fxevent.Provided:
		for _, rtype := range e.OutputTypeNames {
			l.Logger.Debug("provided: ", e.ConstructorName, " => ", rtype)
		}
	case *fxevent.Decorated:
		for _, rtype := range e.OutputTypeNames {
			l.Logger.Debug("decorated: ",
				zap.String("decorator", e.DecoratorName),
				zap.String("type", rtype),
			)
		}
	case *fxevent.Invoking:
		l.Logger.Debug("invoking: ", e.FunctionName)
	case *fxevent.Started:
		if e.Err == nil {
			l.Logger.Debug("started")
		}
	case *fxevent.LoggerInitialized:
		if e.Err == nil {
			l.Logger.Debug("initialized: custom fxevent.Logger -> ", e.ConstructorName)
		}
	}
}

// GetGormLogger gets the gorm framework logger
func (l Logger) GetGormLogger() *GormLogger {
	loggerMu.RLock()
	defer loggerMu.RUnlock()
	
	if zapLogger == nil {
		tempLogger, _ := zap.NewDevelopment()
		logger := tempLogger.WithOptions(
			zap.AddCaller(),
			zap.AddCallerSkip(3),
		)
		return &GormLogger{
			Logger: newSugaredLogger(logger),
			Config: gormlogger.Config{
				LogLevel: gormlogger.Info,
			},
		}
	}
	
	logger := zapLogger.WithOptions(
		zap.AddCaller(),
		zap.AddCallerSkip(3),
	)

	return &GormLogger{
		Logger: newSugaredLogger(logger),
		Config: gormlogger.Config{
			LogLevel: gormlogger.Info,
		},
	}
}

func newSugaredLogger(logger *zap.Logger) *Logger {
	return &Logger{
		SugaredLogger: logger.Sugar(),
	}
}

func colorLevelEncoder(level zapcore.Level, enc zapcore.PrimitiveArrayEncoder) {
	switch level {
	case zapcore.DebugLevel:
		enc.AppendString("\033[36mDEBUG\033[0m")
	case zapcore.InfoLevel:
		enc.AppendString("\033[32mINFO\033[0m")
	case zapcore.WarnLevel:
		enc.AppendString("\033[33mWARN\033[0m")
	case zapcore.ErrorLevel:
		enc.AppendString("\033[31mERROR\033[0m")
	case zapcore.FatalLevel:
		enc.AppendString("\033[35mFATAL\033[0m")
	case zapcore.PanicLevel:
		enc.AppendString("\033[35mPANIC\033[0m")
	default:
		enc.AppendString(level.CapitalString())
	}
}

func timeEncoder(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
	enc.AppendString(t.Format("2006-01-02 15:04:05.000"))
}

func callerEncoder(caller zapcore.EntryCaller, enc zapcore.PrimitiveArrayEncoder) {
	if caller.Defined {
		enc.AppendString("\033[90m" + caller.TrimmedPath() + "\033[0m")
	} else {
		enc.AppendString("\033[90m???\033[0m")
	}
}

func newLogger(env Env) Logger {
	logOutput := os.Getenv("LOG_OUTPUT")
	isDevelopment := env.Environment == "development" || env.Environment == ""

	var config zap.Config
	if isDevelopment {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeTime = timeEncoder
		config.EncoderConfig.EncodeLevel = colorLevelEncoder
		config.EncoderConfig.EncodeCaller = callerEncoder
		config.EncoderConfig.EncodeDuration = zapcore.SecondsDurationEncoder
		config.EncoderConfig.StacktraceKey = "stacktrace"
		config.EncoderConfig.CallerKey = "caller"
		config.EncoderConfig.MessageKey = "msg"
		config.EncoderConfig.LevelKey = "level"
		config.EncoderConfig.TimeKey = "time"
		config.EncoderConfig.NameKey = "logger"
		config.EncoderConfig.FunctionKey = "func"
	} else {
		config = zap.NewProductionConfig()
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		config.EncoderConfig.EncodeLevel = zapcore.LowercaseLevelEncoder
		if logOutput != "" {
			config.OutputPaths = []string{logOutput}
			config.ErrorOutputPaths = []string{logOutput}
		}
	}

	logLevel := env.LogLevel
	if logLevel == "" {
		logLevel = os.Getenv("LOG_LEVEL")
	}
	level := zapcore.InfoLevel
	switch logLevel {
	case "debug":
		level = zapcore.DebugLevel
	case "info":
		level = zapcore.InfoLevel
	case "warn":
		level = zapcore.WarnLevel
	case "error":
		level = zapcore.ErrorLevel
	case "fatal":
		level = zapcore.FatalLevel
	case "panic":
		level = zap.PanicLevel
	default:
		if isDevelopment {
			level = zapcore.DebugLevel
		} else {
			level = zapcore.InfoLevel
		}
	}
	config.Level.SetLevel(level)

	if isDevelopment {
		config.Development = true
		config.DisableStacktrace = false
	}

	var opts []zap.Option
	opts = append(opts, zap.AddCaller(), zap.AddCallerSkip(1))
	if isDevelopment {
		opts = append(opts, zap.AddStacktrace(zapcore.ErrorLevel))
	}

	loggerMu.Lock()
	defer loggerMu.Unlock()
	
	builtLogger, err := config.Build(opts...)
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	
	zapLogger = builtLogger
	logger := newSugaredLogger(builtLogger)

	return *logger
}

func (l GinLogger) Write(p []byte) (n int, err error) {
	msg := string(p)
	msg = strings.TrimSpace(msg)
	if msg != "" {
		l.Info("\033[36m[GIN]\033[0m " + msg)
	}
	return len(p), nil
}

// Printf prits go-fx logs
func (l FxLogger) Printf(str string, args ...interface{}) {
	if len(args) > 0 {
		l.Debugf(str, args...)
	} else {
		l.Debug(str)
	}
}

// GORM Framework Logger Interface Implementations
// ---- START ----

// LogMode set log mode
func (l *GormLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	newlogger := *l
	newlogger.LogLevel = level
	return &newlogger
}

// Info prints info
func (l GormLogger) Info(ctx context.Context, str string, args ...interface{}) {
	if l.LogLevel >= gormlogger.Info {
		if len(args) > 0 {
			l.Debugf(str, args...)
		} else {
			l.Debug(str)
		}
	}
}

// Warn prints warn messages
func (l GormLogger) Warn(ctx context.Context, str string, args ...interface{}) {
	if l.LogLevel >= gormlogger.Warn {
		if len(args) > 0 {
			l.Warnf(str, args...)
		} else {
			l.Logger.Warn(str)
		}
	}
}

// Error prints error messages
func (l GormLogger) Error(ctx context.Context, str string, args ...interface{}) {
	if l.LogLevel >= gormlogger.Error {
		if len(args) > 0 {
			l.Errorf(str, args...)
		} else {
			l.Logger.Error(str)
		}
	}
}

// Trace prints trace messages
func (l GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	if l.LogLevel <= 0 {
		return
	}
	elapsed := time.Since(begin)
	if l.LogLevel >= gormlogger.Info {
		sql, rows := fc()
		l.Debug("[", elapsed.Milliseconds(), " ms, ", rows, " rows] ", "sql -> ", sql)
		return
	}

	if l.LogLevel >= gormlogger.Warn {
		sql, rows := fc()
		l.SugaredLogger.Warn("[", elapsed.Milliseconds(), " ms, ", rows, " rows] ", "sql -> ", sql)
		return
	}

	if l.LogLevel >= gormlogger.Error {
		sql, rows := fc()
		l.SugaredLogger.Error("[", elapsed.Milliseconds(), " ms, ", rows, " rows] ", "sql -> ", sql)
		return
	}
}
