FROM mcr.microsoft.com/vscode/devcontainers/go

RUN umask 0002 && . /usr/local/share/nvm/nvm.sh && nvm install 20 2>&1

USER vscode

ARG GRAFANA_VERSION=10.4.1

RUN echo "Installing Tools" && \
  # Air
  # curl -sSfL https://raw.githubusercontent.com/cosmtrek/air/master/install.sh | sh -s -- -b $(go env GOPATH)/bin && \
  go install github.com/air-verse/air@latest && \
  # Mage
  cd /home/vscode && \
  git clone --single-branch --depth 1 https://github.com/magefile/mage && \
  cd mage && \
  go run bootstrap.go && \
  # GoSec
  go install github.com/securego/gosec/v2/cmd/gosec@latest && \
  # golangci-lint
  # binary will be $(go env GOPATH)/bin/golangci-lint
  curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.53.3 && \
  golangci-lint --version && \
  # go-junit-report
  go install github.com/jstemmer/go-junit-report/v2@latest  && \
  go-junit-report -version && \
  # gocov, gocov-xml for code coverage
  go install github.com/axw/gocov/gocov@latest && \
  go install github.com/AlekSi/gocov-xml@latest && \
  # Grafana
  cd /home/vscode && \
  wget https://dl.grafana.com/oss/release/grafana-${GRAFANA_VERSION}.linux-amd64.tar.gz && \
  tar -zxvf grafana-${GRAFANA_VERSION}.linux-amd64.tar.gz && \
  mv grafana-v${GRAFANA_VERSION} grafana
