# 1️⃣ Make a temporary remote name (in-memory)
temp_remote="vision_temp"

# 2️⃣ Add it using your repo URL
git remote add $temp_remote https://github.com/IgYaHiko/Vision.git

# 3️⃣ Fetch all branches and tags
git fetch $temp_remote --tags

# 4️⃣ Iterate over each branch and import via subtree
for branch in $(git branch -r | grep $temp_remote/ | sed "s|$temp_remote/||"); do
    echo "Importing branch: $branch"
    git subtree add --prefix=igyahiko.vision https://github.com/IgYaHiko/Vision.git $branch
done

# 5️⃣ Remove the remote immediately (so your repo stays clean)
git remote remove $temp_remote
