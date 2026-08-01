#!/usr/bin/env python3
"""生成 VINTAGE 应用图标 PNG（纯标准库，无需 Pillow）。
深空蓝星球 + 倾斜光环 + 星点，匹配 favicon / 设计稿。
输出：icon-192.png(192x192) / icon-512.png(512x512) / icon-maskable-512.png(512x512)

注意：画布尺寸 = 目标尺寸，图形按 size/512 等比缩放；
      manifest 中声明的 sizes 必须与此处实际输出一致，否则部分浏览器会拒绝安装。
"""
import zlib, struct, math, os

class Canvas:
    def __init__(self, size):
        self.n = size
        self.buf = bytearray(size * size * 4)   # 全透明起点

    def blend(self, x, y, r, g, b, a):
        n = self.n
        if 0 <= x < n and 0 <= y < n and a > 0:
            i = (y * n + x) * 4
            buf = self.buf
            sb_r, sb_g, sb_b, sb_a = buf[i], buf[i+1], buf[i+2], buf[i+3]
            ba = sb_a / 255.0
            na = a + ba * (1 - a)
            if na <= 0.004:
                return
            buf[i]   = min(255, int((r * a + sb_r * ba * (1 - a)) / na + 0.5))
            buf[i+1] = min(255, int((g * a + sb_g * ba * (1 - a)) / na + 0.5))
            buf[i+2] = min(255, int((b * a + sb_b * ba * (1 - a)) / na + 0.5))
            buf[i+3] = int(na * 255 + 0.5)


def smoothstep(s0, s1, x):
    t = max(0.0, min(1.0, (x - s0) / (s1 - s0)))
    return t * t * (3 - 2 * t)


def fill_rounded_bg(cv, R):
    n = cv.n
    for y in range(n):
        for x in range(n):
            inside = True
            if x < R and y < R:
                inside = (R - x) ** 2 + (R - y) ** 2 <= R * R
            elif x >= n - R and y < R:
                inside = (n - R - x) ** 2 + (R - y) ** 2 <= R * R
            elif x < R and y >= n - R:
                inside = (R - x) ** 2 + (n - R - y) ** 2 <= R * R
            elif x >= n - R and y >= n - R:
                inside = (x - (n - R)) ** 2 + (y - (n - R)) ** 2 <= R * R
            if inside:
                cv.blend(x, y, 7, 11, 20, 1.0)


def fill_full_bg(cv):
    buf = cv.buf
    for i in range(0, len(buf), 4):
        buf[i], buf[i+1], buf[i+2], buf[i+3] = 7, 11, 20, 255


def draw_planet(cv, cx, cy, rp):
    inner, mid, out = (143, 184, 255), (46, 92, 158), (13, 27, 51)
    for y in range(int(cy - rp - 2), int(cy + rp + 2)):
        for x in range(int(cx - rp - 2), int(cx + rp + 2)):
            d = math.hypot(x - cx, y - cy)
            if d > rp + 1:
                continue
            t = d / rp
            if t < 0.55:
                c = tuple(inner[k] + (mid[k] - inner[k]) * (t / 0.55) for k in (0, 1, 2))
            else:
                c = tuple(mid[k] + (out[k] - mid[k]) * ((t - 0.55) / 0.45) for k in (0, 1, 2))
            cv.blend(x, y, c[0], c[1], c[2], 1.0 - smoothstep(rp - 1, rp + 1, d))


def draw_ring(cv, cx, cy, ra, rb, angle_deg, stroke):
    ang = math.radians(angle_deg)
    ca, sa = math.cos(ang), math.sin(ang)
    hw = stroke / ra
    col = (110, 155, 224)
    for y in range(int(cy - ra - 3), int(cy + ra + 3)):
        for x in range(int(cx - ra - 3), int(cx + ra + 3)):
            dx, dy = x - cx, y - cy
            xr = dx * ca + dy * sa
            yr = -dx * sa + dy * ca
            r = math.sqrt((xr * xr) / (ra * ra) + (yr * yr) / (rb * rb))
            if r < 0.55 or r > 1.6:
                continue
            cv.blend(x, y, col[0], col[1], col[2], 0.85 * (1 - smoothstep(1 - hw, 1 + hw, r)))


def draw_star(cv, cx, cy, rr, color, a):
    for y in range(int(cy - rr - 2), int(cy + rr + 2)):
        for x in range(int(cx - rr - 2), int(cx + rr + 2)):
            d = math.hypot(x - cx, y - cy)
            cv.blend(x, y, color[0], color[1], color[2], a * (1 - smoothstep(rr - 1, rr + 1, d)))


def render(size, maskable=False):
    """按 512 设计稿等比渲染到 size×size 画布。"""
    cv = Canvas(size)
    k = size / 512.0
    c = size / 2.0
    if maskable:
        # 掩码图标：满底 + 内缩安全区（图形约占 80%）
        fill_full_bg(cv)
        rp, ra, rb, sw = 100 * k, 172 * k, 53 * k, 11.5 * k
        s1 = (368 * k, 152 * k, 9.5 * k)
        s2 = (144 * k, 352 * k, 6.5 * k)
    else:
        fill_rounded_bg(cv, max(1, int(112 * k)))
        rp, ra, rb, sw = 120 * k, 208 * k, 64 * k, 12.8 * k
        s1 = (392 * k, 136 * k, 11.2 * k)
        s2 = (104 * k, 368 * k, 8 * k)
    draw_planet(cv, c, c, rp)
    draw_ring(cv, c, c, ra, rb, -18, sw)
    draw_star(cv, s1[0], s1[1], s1[2], (212, 175, 55), 1.0)
    draw_star(cv, s2[0], s2[1], s2[2], (255, 255, 255), 0.7)
    return cv


def write_png(path, cv):
    n = cv.n
    def chunk(typ, data):
        c = typ + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    raw = bytearray()
    for y in range(n):
        raw.append(0)
        raw.extend(cv.buf[y * n * 4:(y + 1) * n * 4])
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 6, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(bytes(raw), 9)))
        f.write(chunk(b'IEND', b''))


if __name__ == '__main__':
    OUT = os.path.join(os.path.dirname(__file__), '..', 'app', 'icons')
    os.makedirs(OUT, exist_ok=True)
    write_png(os.path.join(OUT, 'icon-192.png'), render(192))
    write_png(os.path.join(OUT, 'icon-512.png'), render(512))
    write_png(os.path.join(OUT, 'icon-maskable-512.png'), render(512, maskable=True))
    print('icons written to', os.path.abspath(OUT))
