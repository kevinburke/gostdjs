package go_compat

import "testing"

func TestUint32Add(t *testing.T) {
	start := uint32(2013314400)
	got := start*uint32(16777619) + 48
	if got != 1227497040 {
		t.Errorf("comp: got %d, want %d", got, 1227497040)
	}
}
