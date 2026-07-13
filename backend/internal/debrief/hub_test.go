package debrief

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"gatequest-auth/internal/store"
)

func TestHubBroadcastDeliversToSubscriber(t *testing.T) {
	h := NewHub()
	questID := uuid.New()

	ch, unsubscribe := h.Subscribe(questID)
	defer unsubscribe()

	if got := h.SubscriberCount(questID); got != 1 {
		t.Fatalf("SubscriberCount = %d, want 1", got)
	}

	msg := &store.DebriefMessage{ID: uuid.New(), QuestID: questID, Content: "hello"}
	h.Broadcast(msg)

	select {
	case got := <-ch:
		if got.ID != msg.ID {
			t.Fatalf("received message %v, want %v", got.ID, msg.ID)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for broadcast message")
	}
}

func TestHubBroadcastIgnoresOtherRooms(t *testing.T) {
	h := NewHub()
	roomA, roomB := uuid.New(), uuid.New()

	chA, unsubA := h.Subscribe(roomA)
	defer unsubA()

	h.Broadcast(&store.DebriefMessage{ID: uuid.New(), QuestID: roomB})

	select {
	case msg := <-chA:
		t.Fatalf("room A received a message meant for room B: %+v", msg)
	case <-time.After(50 * time.Millisecond):
		// expected: nothing delivered
	}
}

func TestHubUnsubscribeStopsDeliveryAndCleansUpMap(t *testing.T) {
	h := NewHub()
	questID := uuid.New()

	ch, unsubscribe := h.Subscribe(questID)
	unsubscribe()

	if got := h.SubscriberCount(questID); got != 0 {
		t.Fatalf("SubscriberCount after unsubscribe = %d, want 0", got)
	}
	if _, open := <-ch; open {
		t.Fatal("channel should be closed after unsubscribe")
	}

	// Broadcasting to a room with no subscribers left must not panic
	// (regression check for the "delete map entry when set is empty"
	// path in unsubscribe).
	h.Broadcast(&store.DebriefMessage{ID: uuid.New(), QuestID: questID})
}

func TestHubBroadcastDoesNotBlockOnFullSubscriber(t *testing.T) {
	h := NewHub()
	questID := uuid.New()

	_, unsubscribe := h.Subscribe(questID) // never drained
	defer unsubscribe()

	done := make(chan struct{})
	go func() {
		for i := 0; i < subscriberBuffer+5; i++ {
			h.Broadcast(&store.DebriefMessage{ID: uuid.New(), QuestID: questID})
		}
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Broadcast blocked on a full subscriber instead of dropping the message")
	}
}

func TestHubMultipleSubscribersSameRoom(t *testing.T) {
	h := NewHub()
	questID := uuid.New()

	ch1, unsub1 := h.Subscribe(questID)
	defer unsub1()
	ch2, unsub2 := h.Subscribe(questID)
	defer unsub2()

	if got := h.SubscriberCount(questID); got != 2 {
		t.Fatalf("SubscriberCount = %d, want 2", got)
	}

	msg := &store.DebriefMessage{ID: uuid.New(), QuestID: questID}
	h.Broadcast(msg)

	for i, ch := range []chan *store.DebriefMessage{ch1, ch2} {
		select {
		case got := <-ch:
			if got.ID != msg.ID {
				t.Fatalf("subscriber %d got wrong message", i)
			}
		case <-time.After(time.Second):
			t.Fatalf("subscriber %d timed out waiting for broadcast", i)
		}
	}
}
