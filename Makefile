SHELL = /bin/bash

ESLINT := node_modules/.bin/eslint
MOCHA := node_modules/.bin/mocha
REPLACER := $(GOPATH)/bin/comment-replacer
SHOULD := node_modules/should
TT := node_modules/.bin/tt

node_modules/.bin:
	mkdir -p node_modules/.bin

lint: $(ESLINT)
	$(ESLINT) --env=es6 \
		--rule='{"comma-dangle": ["error", "always-multiline"]}' \
		--rule='{"semi": [2, "always"]}' \
		--rule='{"space-before-blocks": "error"}' \
		--rule='{"keyword-spacing": [ "error", {"before": true, "after": true} ]}' \
		--rule='{"eqeqeq": [2]}' \
		--rule='{"linebreak-style": [ 2, "unix" ]}' \
		--rule='{"indent": [ 0, 2 ]}' \
		--rule='{"curly": "error"}' \
		--rule='{"brace-style": ["error", "1tbs", { "allowSingleLine": true }]}' \
		--rule='{"no-use-before-define": ["error", {functions: true, classes: true, variables: true}]}' \
		.

$(TT): | node_modules/.bin
ifeq ($(shell uname -s), Darwin)
	curl --location --silent https://github.com/kevinburke/tt/releases/download/0.4/tt-darwin-amd64 > $(TT)
else
	curl --location --silent https://github.com/kevinburke/tt/releases/download/0.4/tt-linux-amd64 > $(TT)
endif
	chmod +x $(TT)

$(MOCHA): | node_modules/.bin
	yarn add --no-lockfile --exact --dev mocha

$(ESLINT): | node_modules/.bin
	yarn add --no-lockfile --exact --dev eslint

$(SHOULD): | node_modules
	yarn add --no-lockfile --exact --dev should

js-test: $(MOCHA) $(SHOULD) $(TT)
	find . -name '*.test.js' | xargs tt

test: js-test
	go test ./go_compat

$(REPLACER): scripts/comment-replacer/main.go
	go install ./scripts/comment-replacer

replace-comments: $(REPLACER)
	find . -name 'index.js' -type f | grep -v node_modules | xargs $(REPLACER)

docs:
	yarn add --no-lockfile --exact --dev documentation

ci: lint js-test

clean:
	rm -rf node_modules
