{{/*
Expand the name of the chart.
*/}}
{{- define "crossview.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "crossview.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "crossview.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "crossview.labels" -}}
helm.sh/chart: {{ include "crossview.chart" . }}
{{ include "crossview.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "crossview.selectorLabels" -}}
app.kubernetes.io/name: {{ include "crossview.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Get namespace - uses Release.Namespace (where Helm installs) or falls back to global.namespace or default
*/}}
{{- define "crossview.namespace" -}}
{{- if .Release.Namespace }}
{{- .Release.Namespace }}
{{- else if .Values.global.namespace }}
{{- .Values.global.namespace }}
{{- else }}
{{- "default" }}
{{- end }}
{{- end }}

{{/*
Get ConfigMap name - uses existing ConfigMap if specified, otherwise generates one
*/}}
{{- define "crossview.configMapName" -}}
{{- if .Values.config.ref }}
{{- .Values.config.ref }}
{{- else }}
{{- printf "%s-config" (include "crossview.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Generate valueFrom for a secret/configmap reference
Accepts: secret value (string or object), secret name (for created secrets), secret key (for created secrets)
Returns: valueFrom structure or empty
*/}}
{{- define "crossview.secretValueFrom" -}}
{{- $secret := .secret }}
{{- $secretName := .secretName }}
{{- $secretKey := .secretKey }}
{{- if kindIs "map" $secret }}
  {{- if hasKey $secret "secretKeyRef" }}
valueFrom:
  secretKeyRef:
    name: {{ $secret.secretKeyRef.name }}
    key: {{ $secret.secretKeyRef.key }}
  {{- else if hasKey $secret "configMapKeyRef" }}
valueFrom:
  configMapKeyRef:
    name: {{ $secret.configMapKeyRef.name }}
    key: {{ $secret.configMapKeyRef.key }}
  {{- end }}
{{- else if $secret }}
valueFrom:
  secretKeyRef:
    name: {{ $secretName }}
    key: {{ $secretKey }}
{{- end }}
{{- end }}
