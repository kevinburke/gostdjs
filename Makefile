SHELL = /bin/bash

TT := node_modules/.bin/tt
MOCHA := node_modules/.bin/mocha

node_modules/.bin:
	mkdir -p node_modules/.bin

$(TT): | node_modules/.bin
ifeq ($(shell uname -s), Darwin)
	curl --location --silent https://github.com/kevinburke/tt/releases/download/0.3/tt-darwin-amd64 > $(TT)
else
	curl --location --silent https://github.com/kevinburke/tt/releases/download/0.3/tt-linux-amd64 > $(TT)
endif
	chmod +x $(TT)

$(MOCHA): | node_modules/.bin
	yarn add mocha

test: $(MOCHA) $(TT)
	find . -name '*.test.js' | xargs tt
	go test ./go_compat

ci: $(TT)
	find . -name '*.test.js' | xargs tt

clean:
	rm -rf node_modules
