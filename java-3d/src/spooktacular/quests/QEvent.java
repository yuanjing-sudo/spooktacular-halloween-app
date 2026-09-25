package spooktacular.quests;

/** Game events the quest board listens to — mirrors MineQuestEvent. */
public sealed interface QEvent permits QEvent.BlockBroken, QEvent.OreMined,
        QEvent.GoldSold, QEvent.XpEarned, QEvent.LayerReached, QEvent.SectorMapped,
        QEvent.ClosetOpened, QEvent.CaveHarvested, QEvent.CaveUnlocked,
        QEvent.PetHatched, QEvent.PickForged, QEvent.PackUpgraded, QEvent.Rebirthed,
        QEvent.CritterGreeted, QEvent.MonsterSlain, QEvent.BombThrown, QEvent.DepthReached {
    record BlockBroken() implements QEvent {}
    record OreMined(String name, int count) implements QEvent {}
    record GoldSold(int amount) implements QEvent {}
    record XpEarned(int amount) implements QEvent {}
    record LayerReached(String name) implements QEvent {}
    record SectorMapped(int count) implements QEvent {}
    record ClosetOpened() implements QEvent {}
    record CaveHarvested() implements QEvent {}
    record CaveUnlocked() implements QEvent {}
    record PetHatched() implements QEvent {}
    record PickForged() implements QEvent {}
    record PackUpgraded() implements QEvent {}
    record Rebirthed() implements QEvent {}
    record CritterGreeted() implements QEvent {}
    record MonsterSlain() implements QEvent {}
    record BombThrown() implements QEvent {}
    record DepthReached(double y) implements QEvent {}
}
