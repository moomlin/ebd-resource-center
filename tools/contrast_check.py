# contrast_check.py
# 比對 team-info-title 與 card 背景的對比度

def hex_to_rgb(hexstr):
    hexstr = hexstr.lstrip('#')
    return tuple(int(hexstr[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def srgb_to_linear(c):
    if c <= 0.03928:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4

def rel_luminance(hexstr):
    r, g, b = hex_to_rgb(hexstr)
    r_l = srgb_to_linear(r)
    g_l = srgb_to_linear(g)
    b_l = srgb_to_linear(b)
    return 0.2126 * r_l + 0.7152 * g_l + 0.0722 * b_l

def contrast_ratio(hex1, hex2):
    l1 = rel_luminance(hex1)
    l2 = rel_luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

background = '#fffdfb'  # card background from CSS
colors = {
    'leader': '#5a3a72',      # 召集人 title color
    'supervisor': '#5a3e2a',  # 專業督導 title color
    'deputy': '#1f7b6b',      # 副召集人 title color
    'teacher': '#2b6f9f',     # 專業教師 title color
    'secretary': '#7a5f2a',   # 執行秘書 title color
}

print('背景:', background)
print('\n對比檢查（目標 >= 4.5 為可讀）：\n')
for k, v in colors.items():
    cr = contrast_ratio(v, background)
    status = 'PASS' if cr >= 4.5 else 'WARN'
    print(f"{k:10} {v}  -> contrast ratio: {cr:.2f}  [{status}]")

# 如果有需要，列出建議更深或更淺的替代色（非常簡單的建議：增加深度或降低亮度）
print('\n註：若某項為 WARN，我可幫你微調顏色以符合 WCAG 4.5:1。')
