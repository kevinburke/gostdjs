SHELL = /bin/bash

TT := $(shell command -v tt)

test:
ifndef TT
	go get -u github.com/kevinburke/tt
endif
	find . -name '*.test.js' | xargs tt
	go test ./go_compat
