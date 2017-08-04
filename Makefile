SHELL = /bin/bash

TT := node_modules/.bin/tt

$(TT):
ifeq ($(shell uname -s), Darwin)
	curl --location --silent https://github.com/kevinburke/tt/releases/download/0.3/tt-darwin-amd64 > $(TT)
else
	curl --location --silent https://github.com/kevinburke/tt/releases/download/0.3/tt-linux-amd64 > $(TT)
endif
	chmod +x $(TT)

test: $(TT)
	find . -name '*.test.js' | xargs tt
	go test ./go_compat

ci: $(TT)
	find . -name '*.test.js' | xargs tt
