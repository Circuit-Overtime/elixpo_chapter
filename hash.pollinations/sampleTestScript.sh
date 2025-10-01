echo "checking if redis is running"
if ! pgrep -x "redis-server" > /dev/null; then
    echo "starting redis"
    redis-server &
else
    echo "redis is already running"
fi

echo "checking if mongo is running"
if ! pgrep -x "mongod" > /dev/null; then
    echo "starting mongo"
    mongod --fork --logpath /var/log/mongodb.log
else
    echo "mongo is already running"
fi

echo "sending test payload"
python3 PRODUCTION/leakTestScript.py