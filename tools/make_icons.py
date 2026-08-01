#!/usr/bin/env python3
"""生成 VINTAGE 应用图标 PNG（纯标准库，无需 Pillow）。
深空蓝星球 + 倾斜光环 + 星点，匹配 favicon / 设计稿。
输出：icon-192.png / icon-512.png / icon-maskable-512.png
"""
import zlib, struct, math

W = H = 512
buf = bytearray(W * H * 4)  # 全透明起点

def blend(x, y, r, g, b, a):
    if 0 <= x < W and 0 <= y < H and a > 0:
        i = (y * W + x) * 4
        sb_r, sb_g, sb_b, sb_a = buf[i], buf[i+1], buf[i+2], buf[i+3]
        ba = sb_a / 255.0
        na = a + ba * (1 - a)
        if na <= 0.004:
            return
        nr = (r * a + sb_r * ba * (1 - a)) / na
        ng = (g * a + sb_g * ba * (1 - a)) / na
        nb = (b * a + sb_b * ba * (1 - a)) / na
        buf[i]   = min(255, int(nr + 0.5))
        buf[i+1] = min(255, int(ng + 0.5))
        buf[i+2] = min(255, int(nb + 0.5))
        buf[i+3] = int(na * 255 + 0.5)

def smoothstep(s0, s1, x):
    t = max(0.0, min(1.0, (x - s0) / (s1 - s0)))
    return t * t * (3 - 2 * t)

def fill_rounded_bg(R):
    for y in range(H):
        for x in range(W):
            inside = True
            if x < R and y < R:
                inside = (R - x) ** 2 + (R - y) ** 2 <= R * R
            elif x >= W - R and y < R:
                inside = (W - R - x) ** 2 + (R - y) ** 2 <= R * R
            elif x < R and y >= H - R:
                inside = (R - x) ** 2 + (H - R - y) ** 2 <= R * R
            elif x >= W - R and y >= H - R:
                inside = (x - (W - R)) ** 2 + (y - (H - R)) ** 2 <= R * R
            if inside:
                blend(x, y, 7, 11, 20, 1.0)

def fill_full_bg():
    for i in range(0, len(buf), 4):
        buf[i], buf[i+1], buf[i+2], buf[i+3] = 7, 11, 20, 255

def draw_planet(cx, cy, rp):
    inner = (143, 184, 255)
    mid   = (46, 92, 158)
    out   = (13, 27, 51)
    for y in range(int(cy - rp - 2), int(cy + rp + 2)):
        for x in range(int(cx - rp - 2), int(cx + rp + 2)):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            if d > rp + 1:
                continue
            t = d / rp
            if t < 0.55:
                c = tuple(inner[k] + (mid[k] - inner[k]) * (t / 0.55) for k in (0, 1, 2))
            else:
                c = tuple(mid[k] + (out[k] - mid[k]) * ((t - 0.55) / 0.45) for k in (0, 1, 2))
            a = 1.0 - smoothstep(rp - 1, rp + 1, d)
            blend(x, y, c[0], c[1], c[2], a)

def draw_ring(cx, cy, ra, rb, angle_deg):
    ang = math.radians(angle_deg)
    ca, sa = math.cos(ang), math.sin(ang)
    hw = 12.8 / ra  # 归一化半宽
    col = (110, 155, 224)
    for y in range(int(cy - ra - 3), int(cy + ra + 3)):
        for x in range(int(cx - ra - 3), int(cx + ra + 3)):
            dx, dy = x - cx, y - cy
            xr = dx * ca + dy * sa
            yr = -dx * sa + dy * ca
            norm = (xr * xr) / (ra * ra) + (yr * yr) / (rb * rb)
            r = math.sqrt(norm)
            if r < 0.55 or r > 1.6:
                continue
            a = 0.85 * (1 - smoothstep(1 - hw, 1 + hw, r))
            blend(x, y, col[0], col[1], col[2], a)

def draw_star(cx, cy, rr, color, a):
    for y in range(int(cy - rr - 1), int(cy + rr + 1)):
        for x in range(int(cx - rr - 1), int(cx + rr + 1)):
            d = math.hypot(x - cx, y - cy)
            aa = a * (1 - smoothstep(rr - 1, rr + 1, d))
            blend(x, y, color[0], color[1], color[2], aa)

def write_png(path, scale):
    """scale: 1.0 -> 512, 0.375 -> 192。星球随画布缩放。"""
    global buf
    buf = bytearray(W * H * 4)
    cx, cy = 256, 256
    if scale < 1.0:
        # 非掩码：圆角透明底
        fill_rounded_bg(int(112 * scale))
        rp = int(120 * scale)
        ra, rb = int(208 * scale), int(64 * scale)
        draw_planet(cx, cy, rp)
        draw_ring(cx, cy, ra, rb, -18)
        draw_star(int(392 * scale), int(136 * scale), int(11.2 * scale), (212, 175, 55), 1.0)
        draw_star(int(104 * scale), int(368 * scale), int(8 * scale), (255, 255, 255), 0.7)
    else:
        # 掩码：满底，星球居中略小（安全区）
        fill_full_bg()
        rp = int(110 * scale)
        ra, rb = int(190 * scale), int(60 * scale)
        draw_planet(cx, cy, rp)
        draw_ring(cx, cy, ra, rb, -18)
        draw_star(int(392 * scale), int(136 * scale), int(10 * scale), (212, 175, 55), 1.0)
        draw_star(int(104 * scale), int(368 * scale), int(7 * scale), (255, 255, 255), 0.7)

    def chunk(typ, data):
        c = typ + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    raw = bytearray()
    for y in range(H):
        raw.append(0)
        raw.extend(buf[y * W * 4:(y + 1) * W * 4])
    idat = zlib.compress(bytes(raw), 9)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))

import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'app', 'icons')
os.makedirs(OUT, exist_ok=True)
write_png(os.path.join(OUT, 'icon-512.png'), 1.0)
write_png(os.path.join(OUT, 'icon-maskable-512.png'), 1.0)
write_png(os.path.join(OUT, 'icon-192.png'), 0.375)
print('icons written to', os.path.abspath(OUT))
