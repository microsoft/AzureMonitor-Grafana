echo "Starting Grafana"
rm -rf $WORKSPACE_FOLDER/grafana/plugins/azure-monitor-app
mkdir -p $WORKSPACE_FOLDER/grafana/plugins/azure-monitor-app
ln -s $WORKSPACE_FOLDER/dist $WORKSPACE_FOLDER/grafana/plugins/azure-monitor-app
cd /home/vscode/grafana/bin 
./grafana server -config $WORKSPACE_FOLDER/grafana/grafana.ini 
