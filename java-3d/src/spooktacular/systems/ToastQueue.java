package spooktacular.systems;

import java.util.*;

/** Toast queue — port of SpookyToastQueue (coalescing, max stored, 4s expiry
 *  on virtual time, UUID dismiss). */
public class ToastQueue {
    public record Toast(UUID id, String emoji, String title, String detail, double at) {}

    private final List<Toast> toasts = new ArrayList<>();
    public final int maxStored = 6;
    public Scheduler scheduler = Scheduler.main;

    public ToastQueue() {}
    public ToastQueue(Scheduler s) { scheduler = s; }

    public List<Toast> toasts() { return List.copyOf(toasts); }

    public void show(String emoji, String title, String detail) {
        if (!toasts.isEmpty()) {
            Toast last = toasts.get(toasts.size() - 1);
            if (last.title().equals(title) && scheduler.now() - last.at() < 5) {
                toasts.set(toasts.size() - 1,
                        new Toast(last.id(), last.emoji(), last.title(),
                                detail.isEmpty() ? last.detail() : detail, scheduler.now()));
                return;
            }
        }
        Toast t = new Toast(UUID.randomUUID(), emoji, title, detail, scheduler.now());
        toasts.add(t);
        while (toasts.size() > maxStored) toasts.remove(0);
        UUID id = t.id();
        scheduler.schedule(4, u -> toasts.removeIf(x -> x.id().equals(id)));
    }

    public void show(String emoji, String title) { show(emoji, title, ""); }

    public void dismiss(UUID id) { toasts.removeIf(t -> t.id().equals(id)); }
    public void clear() { toasts.clear(); }
}
