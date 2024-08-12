 echo "Starting Grafana"
  cp -r ./dist ./grafana/plugins/aks_plugin
  cd /home/vscode/grafana/bin 
  ./grafana server -config $WORKSPACE_FOLDER/grafana/grafana.ini 
