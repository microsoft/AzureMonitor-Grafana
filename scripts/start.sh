 echo "Starting Grafana"
  mkdir -p $WORKSPACE_FOLDER/grafana/plugins/azure-monitor-app
  ln -s ./dist ./grafana/plugins/azure-monitor-app
  cd /home/vscode/grafana/bin 
  ./grafana server -config $WORKSPACE_FOLDER/grafana/grafana.ini 
