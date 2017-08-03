package go_compat

import (
	"fmt"
	"testing"
	"unicode/utf16"
	"unicode/utf8"
)

func TestUint32Add(t *testing.T) {
	start := uint32(2013314400)
	got := start*uint32(16777619) + 48
	if got != 1227497040 {
		t.Errorf("comp: got %d, want %d", got, 1227497040)
	}
}

func TestConvert(t *testing.T) {
	s := "\ufffd"
	r, size := utf8.DecodeRuneInString(s)
	fmt.Println("r", r)
	fmt.Println("size", size)
	r1, r2 := utf16.EncodeRune(r)
	fmt.Printf("%x\n", r1)
	fmt.Printf("%x\n", r2)
}
