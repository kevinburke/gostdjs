SHELL = /bin/bash

ESLINT := node_modules/.bin/eslint
MOCHA := node_modules/.bin/mocha
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
		.

$(TT): | node_modules/.bin
ifeq ($(shell uname -s), Darwin)
	curl --location --silent https://github.com/kevinburke/tt/releases/download/0.3/tt-darwin-amd64 > $(TT)
else
	curl --location --silent https://github.com/kevinburke/tt/releases/download/0.3/tt-linux-amd64 > $(TT)
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

ci: lint js-test

clean:
	rm -rf node_modules
