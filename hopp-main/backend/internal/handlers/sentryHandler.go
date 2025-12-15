package handlers

import (
	"hopp-backend/internal/config"

	"github.com/getsentry/sentry-go"
	sentryecho "github.com/getsentry/sentry-go/echo"
	"github.com/labstack/echo/v4"
)

func SetupSentry(e *echo.Echo, cfg *config.Config) {
	// To initialize Sentry's handler, you need to initialize Sentry itself beforehand
	if err := sentry.Init(sentry.ClientOptions{
		Dsn: cfg.Sentry.DSN,
		// Set TracesSampleRate to 1.0 to capture 100%
		// of transactions for tracing.
		// We recommend adjusting this value in production,
		TracesSampleRate: 1.0,
	}); err != nil {
		e.Logger.Error("Sentry initialization failed: %v\n", err)
	}

	e.Use(sentryecho.New(sentryecho.Options{}))
}

func UnwantedQuery(c echo.Context) {
	if hub := sentryecho.GetHubFromContext(c); hub != nil {
		hub.WithScope(func(scope *sentry.Scope) {
			scope.SetExtra("unwantedQuery", "someQueryDataMaybe")
			hub.CaptureMessage("User provided unwanted query string, but we recovered just fine")
		})
	}
}

func CaptureError(err error) {
	sentry.CaptureException(err)
}
