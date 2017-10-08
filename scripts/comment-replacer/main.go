package main

import (
	"bufio"
	"bytes"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/dchest/safefile"
)

var headerFile = strings.Split(`// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.`, "\n")

func fatal(fname string, line int, err error) {
	fmt.Fprintf(os.Stderr, "%s line %d: %v\n", fname, line, err)
	os.Exit(1)
}

func main() {
	flag.Parse()
	args := flag.Args()
	buf := new(bytes.Buffer)
	for i := range args {
		buf.Reset()
		f, err := os.Open(args[i])
		if err != nil {
			log.Fatal(err)
		}
		scanner := bufio.NewScanner(f)
		j := -1
		commentStarted := false
		//commentStartedLine := j
		for scanner.Scan() {
			j++
			l := scanner.Text()
			switch j {
			case 0, 1, 2:
				if !strings.HasPrefix(l, headerFile[j]) {
					fatal(args[i], j, errors.New("first line of file does not contain version preamble"))
				}
				buf.WriteString(l)
				buf.WriteByte('\n')
			default:
				l2 := strings.TrimSpace(l)
				whitespacelen := len(l) - len(l2)
				whiteSpace := l[:whitespacelen]
				if len(l2) < 2 || l2[:2] != "//" {
					if commentStarted {
						buf.WriteString(whiteSpace)
						buf.WriteString(" */")
						buf.WriteByte('\n')
						commentStarted = false
					}
					buf.WriteString(l)
					buf.WriteByte('\n')
					continue
				}
				if len(l2) >= 3 && l2[:3] == "///" {
					// hack to avoid having to write a more complicated parser.
					// documentation-js parses anything with the /** .. */ form
					// and turns it into a comment. but we don't want comments
					// inside of a function to be switched.
				}
				// if we get here, it's a comment.
				if !commentStarted {
					buf.WriteString(whiteSpace)
					buf.WriteString("/**")
					buf.WriteByte('\n')
					commentStarted = true
				}
				buf.WriteString(whiteSpace)
				buf.WriteString(" *")
				buf.WriteString(l2[2:])
				buf.WriteByte('\n')
			}
		}
		if err := scanner.Err(); err != nil {
			fatal(args[i], j, err)
		}
		info, err := f.Stat()
		if err != nil {
			fatal(args[i], -1, err)
		}
		f2, err := safefile.Create(f.Name(), info.Mode())
		if err != nil {
			fatal(args[i], -1, err)
		}
		if _, err := f2.Write(buf.Bytes()); err != nil {
			fatal(args[i], -1, err)
		}
		f.Close()
		if err := f2.Commit(); err != nil {
			fatal(args[i], -1, err)
		}
		if err := f2.Close(); err != nil {
			fatal(args[i], -1, err)
		}
		fmt.Fprintf(os.Stdout, "rewrote comments in %s\n", args[i])
	}
}
