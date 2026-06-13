package services

import (
    "fmt"
    "sync"

    "github.com/google/uuid"

    "social-network/backend/internal/models"
)

// FollowService manages follow relationships in-memory.
type FollowService struct {
    mu        sync.RWMutex
    follows   map[string]models.Follow            // key: follower:following
    followers map[string]map[string]struct{}     // key: followingID -> set of followerID
    following map[string]map[string]struct{}     // key: followerID -> set of followingID
}

// NewFollowService creates an in-memory FollowService.
func NewFollowService() *FollowService {
    return &FollowService{
        follows:   make(map[string]models.Follow),
        followers: make(map[string]map[string]struct{}),
        following: make(map[string]map[string]struct{}),
    }
}

func keyOf(follower, following uuid.UUID) string {
    return fmt.Sprintf("%s:%s", follower.String(), following.String())
}

// Follow creates a follow relationship. Idempotent.
func (s *FollowService) Follow(follower, following uuid.UUID) error {
    if follower == following {
        return nil
    }
    k := keyOf(follower, following)
    s.mu.Lock()
    defer s.mu.Unlock()
    if _, ok := s.follows[k]; ok {
        return nil
    }
    f, _ := models.NewFollow(follower, following)
    s.follows[k] = f
    // update follower set
    if _, ok := s.followers[following.String()]; !ok {
        s.followers[following.String()] = make(map[string]struct{})
    }
    s.followers[following.String()][follower.String()] = struct{}{}
    // update following set
    if _, ok := s.following[follower.String()]; !ok {
        s.following[follower.String()] = make(map[string]struct{})
    }
    s.following[follower.String()][following.String()] = struct{}{}
    return nil
}

// Unfollow removes a follow relationship. Idempotent.
func (s *FollowService) Unfollow(follower, following uuid.UUID) error {
    k := keyOf(follower, following)
    s.mu.Lock()
    defer s.mu.Unlock()
    if _, ok := s.follows[k]; !ok {
        return nil
    }
    delete(s.follows, k)
    delete(s.followers[following.String()], follower.String())
    if len(s.followers[following.String()]) == 0 {
        delete(s.followers, following.String())
    }
    delete(s.following[follower.String()], following.String())
    if len(s.following[follower.String()]) == 0 {
        delete(s.following, follower.String())
    }
    return nil
}

// IsFollowing returns true when follower follows following.
func (s *FollowService) IsFollowing(follower, following uuid.UUID) bool {
    k := keyOf(follower, following)
    s.mu.RLock()
    defer s.mu.RUnlock()
    _, ok := s.follows[k]
    return ok
}

// GetFollowers returns follower IDs for a given user.
func (s *FollowService) GetFollowers(user uuid.UUID) []uuid.UUID {
    s.mu.RLock()
    defer s.mu.RUnlock()
    set, ok := s.followers[user.String()]
    if !ok {
        return nil
    }
    out := make([]uuid.UUID, 0, len(set))
    for id := range set {
        if u, err := uuid.Parse(id); err == nil {
            out = append(out, u)
        }
    }
    return out
}

// GetFollowing returns IDs that the user is following.
func (s *FollowService) GetFollowing(user uuid.UUID) []uuid.UUID {
    s.mu.RLock()
    defer s.mu.RUnlock()
    set, ok := s.following[user.String()]
    if !ok {
        return nil
    }
    out := make([]uuid.UUID, 0, len(set))
    for id := range set {
        if u, err := uuid.Parse(id); err == nil {
            out = append(out, u)
        }
    }
    return out
}
