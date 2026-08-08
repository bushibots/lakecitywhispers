import re
import sys

with open('Feed.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Extract the post rendering block
match = re.search(r'(posts\.map\(post => \{\n\s+const identity = post\.author_username \|\| \'Anonymous\';\n\s+return \(\n\s+<div key=\{post\.id\} className="feed-card">\n.*?)\)\s*\)\s*\}\s*</div>\s*</div>\s*\);\s*\}', code, re.DOTALL)

if not match:
    print('Failed to find post block')
    sys.exit(1)

post_render_block = match.group(1)

# extract just the content inside return ()
card_match = re.search(r'return \(\n\s+(<div key=\{post\.id\} className="feed-card">.*?\n\s+</div>)\n\s+\);', post_render_block, re.DOTALL)

if not card_match:
    print('Failed to find card match')
    sys.exit(1)

card_jsx = card_match.group(1)

# Add isDailyPrompt styling to the root div
card_jsx = card_jsx.replace('<div key={post.id} className="feed-card">', '<div key={post.id} className="feed-card" style={isDailyPrompt ? { border: \'2px solid var(--accent-color)\', boxShadow: \'0 4px 12px rgba(108, 92, 231, 0.15)\', position: \'relative\' } : {}}>\n        {isDailyPrompt && <div style={{ position: \'absolute\', top: \'-12px\', left: \'1.5rem\', backgroundColor: \'var(--accent-color)\', color: \'white\', padding: \'0.2rem 0.8rem\', borderRadius: \'12px\', fontSize: \'0.7rem\', fontWeight: \'bold\', textTransform: \'uppercase\', letterSpacing: \'1px\', display: \'flex\', alignItems: \'center\', gap: \'4px\' }}><Flame size={12}/> Prompt of the Day</div>}')

render_function = f'''
  const renderPost = (post, isDailyPrompt = false) => {{
    if (!post) return null;
    const identity = post.author_username || 'Anonymous';
    return (
      {card_jsx}
    );
  }};
'''

# 2. Insert render_function right before return (
code = code.replace('  return (\n    <div className="page-content">', render_function + '\n  return (\n    <div className="page-content">')

# 3. Remove old dailyPrompt banner
old_banner = r'      \{dailyPrompt && \(\n\s*<div style=\{\{ backgroundColor: \'var\(--accent-color\)\'.*?<\/div>\n\s*\)\}\n'
code = re.sub(old_banner, '', code, flags=re.DOTALL)

# 4. Insert new dailyPrompt section below composer
composer_end = r'      </div>\n\n      \{\/\* Feed Cards \*\/\}'
new_prompt_section = '''      </div>

      {dailyPrompt && filterTopic === '' && (
        <div className="daily-prompt-section" style={{ marginBottom: '2rem' }}>
          {renderPost(dailyPrompt, true)}
        </div>
      )}

      {/* Feed Cards */}'''
code = re.sub(composer_end, new_prompt_section, code)

# 5. Replace posts.map with filter
code = code.replace(post_render_block, '''posts.filter(p => !dailyPrompt || p.id !== dailyPrompt.id).map(p => renderPost(p))
        )}''')

with open('Feed.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Refactoring successful')
