# -*- coding: utf-8 -*-

with open('css/style.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

with open('js/sound.js', 'r', encoding='utf-8') as f:
    sound_js = f.read().replace('export const sound', 'const sound')

with open('js/speech.js', 'r', encoding='utf-8') as f:
    speech_js = f.read().replace('export const speech', 'const speech')

with open('js/timer.js', 'r', encoding='utf-8') as f:
    timer_js = f.read().replace("import { sound } from './sound.js';", '').replace('export class QuizTimer', 'class QuizTimer')

with open('js/canvas.js', 'r', encoding='utf-8') as f:
    canvas_js = f.read().replace('export class TianZiGeCanvas', 'class TianZiGeCanvas')

with open('js/bank.js', 'r', encoding='utf-8') as f:
    bank_js = f.read().replace('export const bankManager', 'const bankManager')

with open('js/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    app_lines = [l for l in lines if not l.startswith('import ')]
    app_js = ''.join(app_lines)

combined_js = f"""// === 音效模組 ===
{sound_js}

// === 語音模組 ===
{speech_js}

// === 計時器模組 ===
{timer_js}

// === 田字格畫布核心 ===
{canvas_js}

// === 題庫管理模組 ===
{bank_js}

// === 主控制器 ===
{app_js}
"""

# 存成 js/bundle.js
with open('js/bundle.js', 'w', encoding='utf-8') as f:
    f.write(combined_js)

# 讀取 index_template.html 模板並注入 CSS 與 JS
with open('index_template.html', 'r', encoding='utf-8') as f:
    html = f.read()

style_tag = f"<style>\n{css_content}\n</style>"
script_tag = f"<script>\n{combined_js}\n</script>"

html = html.replace('<!-- INJECT_STYLE -->', style_tag)
html = html.replace('<!-- INJECT_SCRIPT -->', script_tag)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Self-contained index.html built successfully! Size:", len(html))
