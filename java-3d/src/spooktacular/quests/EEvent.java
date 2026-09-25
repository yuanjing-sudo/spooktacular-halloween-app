package spooktacular.quests;

/** Maze events — mirrors MazeExpeditionEvent. */
public sealed interface EEvent permits EEvent.ClosetOpened, EEvent.CaveHarvested,
        EEvent.BoxyMet, EEvent.ForkRaised, EEvent.RegionMapped, EEvent.DistanceBanked,
        EEvent.TreasureFound, EEvent.MonsterSlain, EEvent.CrystalMined, EEvent.ScoreEarned {
    record ClosetOpened() implements EEvent {}
    record CaveHarvested() implements EEvent {}
    record BoxyMet() implements EEvent {}
    record ForkRaised() implements EEvent {}
    record RegionMapped(int count) implements EEvent {}
    record DistanceBanked(int meters) implements EEvent {}
    record TreasureFound() implements EEvent {}
    record MonsterSlain() implements EEvent {}
    record CrystalMined() implements EEvent {}
    record ScoreEarned(int points) implements EEvent {}
}
