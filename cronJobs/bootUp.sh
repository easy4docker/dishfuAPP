echo $(date -u) "Ran cronOnboot" 
mkdir -p /var/dishfuPDF/input/
mkdir -p /var/dishfuPDF/output/
mkdir -p /var/dishfuPDF/done/
mkdir -p /var/dishfuPDF/failed/
cd /var/app && npm install
npm audit fix --force
# npm start &
cron start &
echo "==== boot up ==== $(date -u ==="
npm start
