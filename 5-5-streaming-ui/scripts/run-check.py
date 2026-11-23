import datetime, json, pathlib, subprocess, sys
root=pathlib.Path(__file__).resolve().parents[1]
ev=root.parents[4]/'.local/video-workspace/streaming-ui-all-20261122/demo-evidence'
name, *command=sys.argv[1:]
started=datetime.datetime.now().astimezone().isoformat()
result=subprocess.run(command,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
record={'actor':'video_demo_build agent','kind':'command','name':name,'command':command,'cwd':str(root),'startedAt':started,'completedAt':datetime.datetime.now().astimezone().isoformat(),'exitCode':result.returncode}
(ev/'logs').mkdir(exist_ok=True)
(ev/'logs'/f'{name}.log').write_text(json.dumps(record,ensure_ascii=False)+'\n'+result.stdout)
with (ev/'execution.jsonl').open('a') as f:f.write(json.dumps(record,ensure_ascii=False)+'\n')
print(result.stdout);print(json.dumps(record,ensure_ascii=False));sys.exit(result.returncode)
