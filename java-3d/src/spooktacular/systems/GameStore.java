package spooktacular.systems;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.prefs.Preferences;

/** Portable key-value persistence (was UserDefaults). Preferences-backed on
 *  desktop JVMs, so progress survives restarts everywhere Java runs. */
public class GameStore {
    public static final GameStore standard = new GameStore("spookycore");
    private final Preferences prefs;

    public GameStore(String node) {
        prefs = Preferences.userRoot().node("spooktacular/" + node);
    }

    public void set(String key, int v) { prefs.putInt(key, v); }
    public void set(String key, long v) { prefs.putLong(key, v); }
    public void set(String key, boolean v) { prefs.putBoolean(key, v); }
    public void set(String key, double v) { prefs.putDouble(key, v); }
    public void set(String key, String v) { prefs.put(key, v == null ? "" : v); }
    public void set(String key, byte[] v) { prefs.putByteArray(key, v); }

    public void setStrings(String key, Collection<String> v) {
        prefs.put(key, String.join("\u001F", v));
    }

    public void setMap(String key, Map<String, Integer> m) {
        StringJoiner j = new StringJoiner(";");
        for (var e : m.entrySet())
            j.add(enc(e.getKey()) + "=" + e.getValue());
        prefs.put(key, j.toString());
    }

    public int num(String key) { return prefs.getInt(key, 0); }
    public int num(String key, int def) { return prefs.getInt(key, def); }
    public long lng(String key, long def) { return prefs.getLong(key, def); }
    public boolean bool(String key, boolean def) { return prefs.getBoolean(key, def); }
    public double dbl(String key, double def) { return prefs.getDouble(key, def); }
    public String str(String key, String def) { return prefs.get(key, def); }

    public boolean has(String key) {
        try {
            return Arrays.asList(prefs.keys()).contains(key);
        } catch (Exception e) { return false; }
    }

    public List<String> stringArray(String key) {
        String v = prefs.get(key, null);
        if (v == null || v.isEmpty()) return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(v.split("\u001F", -1)));
    }

    public Map<String, Integer> map(String key) {
        Map<String, Integer> m = new LinkedHashMap<>();
        String v = prefs.get(key, "");
        if (v.isEmpty()) return m;
        for (String pair : v.split(";")) {
            int i = pair.indexOf('=');
            if (i > 0) {
                try { m.put(dec(pair.substring(0, i)), Integer.parseInt(pair.substring(i + 1))); }
                catch (NumberFormatException ignored) {}
            }
        }
        return m;
    }

    public byte[] data(String key) {
        try { return prefs.getByteArray(key, null); }
        catch (Exception e) { return null; }
    }

    public void remove(String key) { prefs.remove(key); }

    private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }
    private static String dec(String s) { return URLDecoder.decode(s, StandardCharsets.UTF_8); }
}
