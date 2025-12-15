package middlewares

import (
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
	"net/http"
)

// RequireAuth is a middleware that checks if the user is authenticated
// The check is done in two levels:
// 1. Get the session from the cookies
// 2. Find if the session token is as a Bearer token in the Authorization header
func RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		sess, _ := session.Get("session", c)

		if sess != nil {

			auth, _ := sess.Values["authenticated"].(bool)

			if !auth {
				return c.HTML(http.StatusUnauthorized, "You are not authenticated")
			}

			return next(c)

		}

		return c.HTML(http.StatusUnauthorized, "You are not authenticated")
	}
}
