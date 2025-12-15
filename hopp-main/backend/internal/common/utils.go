package common

import (
	"fmt"
)

func GetUserChannel(id string) string {
	return fmt.Sprintf("channel-user-%s", id)
}
