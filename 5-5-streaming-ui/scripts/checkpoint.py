"""Save real staged source snapshots; never fabricate an execution transcript."""
import datetime, difflib, hashlib, json, pathlib, sys

root = pathlib.Path(__file__).resolve().parents[1]
repo = root.parents[4]
evidence = repo / '.local/video-workspace/streaming-ui-all-20261122/demo-evidence'
stage, feedback = sys.argv[1:3]
base = evidence / 'checkpoints'
previous = sorted(base.glob('*'))[-1] if base.exists() and list(base.iterdir()) else None
destination = base / stage
destination.mkdir(parents=True, exist_ok=True)
files = [p for folder in ['src', 'tests', 'scripts', 'doc', 'public'] for p in (root/folder).rglob('*') if p.is_file()]
files += [root/name for name in ['package.json','tsconfig.json','README.md','next.config.mjs','postcss.config.mjs']]
manifest, diff = [], []
for path in sorted(files):
    relative = path.relative_to(root)
    data = path.read_bytes()
    target = destination/'source'/relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    manifest.append({'path': str(relative), 'sha256': hashlib.sha256(data).hexdigest()})
    before = previous/'source'/relative if previous else None
    if path.suffix == '.ico':
        continue
    old = before.read_text().splitlines(True) if before and before.exists() else []
    diff.extend(difflib.unified_diff(old, data.decode().splitlines(True), fromfile=f'before/{relative}', tofile=f'after/{relative}'))
(destination/'manifest.json').write_text(json.dumps(manifest, indent=2))
(destination/'changes.diff').write_text(''.join(diff))
entry = {'time': datetime.datetime.now().astimezone().isoformat(), 'actor': 'video_demo_build agent', 'stage': stage, 'action': 'Saved actual source and diff', 'feedback': feedback, 'provenance': 'Agent execution record; not an AI client screen recording'}
with (evidence/'execution.jsonl').open('a') as output: output.write(json.dumps(entry, ensure_ascii=False)+'\n')
print(json.dumps(entry, ensure_ascii=False))
