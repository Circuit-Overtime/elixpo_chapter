what we need to also take care of is that -- we need to save a shared memory for the PRs we are making, since the PRs  may need followup until merged or closed -- the TTL  of such followups is 2 month ~ 360 days since the day of posting  the PR

the shared memory stays in gist with metadata of the issue, if the issue is closed or merged we simply remove that and update the tracker for completion 
if the issue has a conversation header with @elixpoo then elixpo behaves as usual to respond to the reqeust made in that issue / pr, but if the issue / pr is already in the memory and elixpoo has worked in it before then the shared memory can be used to come back to it, 

if @elixpoo is done on a new PR or issue of any public repo, then elixpoo will follow the ground up plan to fork the repo (if already not) and then getting a sandbox to actually respond to the issue with whateevr the reqeust is if not NSFW) 

on @elixpoo tag of PR / issue convesations - elixpo must give a status message to it kinda in the mid way that it's doing something and ccr streaming will happen as a to do list 

make a detailed issue on this which we will handle after the solver is done


the discussion agent shall also be looking at @elixpoo tags in the replies (check if this is wired up)

also the agentic systems are hitting a hard wall of 32 turns we can fix that too https://github.com/elixpo/blogs.elixpo/actions/runs/30892976476/job/91939167118 