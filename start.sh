#! /bin/bash
set -x
set -e
LONG_NAME="accubot"
SHORT_NAME="accubot"
export NODE_BIN_DIR="/usr/bin"
export NODE_PATH="/usr/lib/node_modules"
export APPLICATION_PATH="/home/jgdovin/$LONG_NAME/bot.js"
export PIDFILE="/var/run/$LONG_NAME.pid"
export LOG="/home/jgdovin/log/$LONG_NAME.log"
export MIN_UPTIME="5000"
export SPIN_SLEEP_TIME="2000"
export WORKING_DIR="/home/jgdovin/$LONG_NAME"
export TOKEN="xoxb-3123379600-1319221351281-t1kyjA1CFmMWM5e6GM8AjUHk"
exec forever \
  --pidFile $PIDFILE \
  -a \
  -l $LOG \
  --minUptime $MIN_UPTIME \
  --spinSleepTime $SPIN_SLEEP_TIME \
  --workingDir $WORKING_DIR \
  --no-colors \
  --watchDirectory $WORKING_DIR \
  --uid $SHORT_NAME \
  --process $SHORT_NAME \
  start $APPLICATION_PATH
