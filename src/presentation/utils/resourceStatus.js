export const getStatusColor = (conditions, kind) => {
  if (!conditions || conditions.length === 0) return 'gray';
  
  if (kind === 'Provider') {
    const healthyCondition = conditions.find(c => c.type === 'Healthy');
    if (healthyCondition?.status === 'True') return 'green';
    if (healthyCondition?.status === 'False') return 'red';
    return 'yellow';
  }
  
  const syncedCondition = conditions.find(c => c.type === 'Synced');
  const readyCondition = conditions.find(c => c.type === 'Ready');
  
  if (syncedCondition && readyCondition) {
    if (syncedCondition.status === 'True' && readyCondition.status === 'True') return 'green';
    if (syncedCondition.status === 'False' || readyCondition.status === 'False') return 'red';
    return 'yellow';
  }
  
  if (syncedCondition) {
    if (syncedCondition.status === 'True') return 'green';
    if (syncedCondition.status === 'False') return 'red';
    return 'yellow';
  }
  
  if (readyCondition) {
    if (readyCondition.status === 'True') return 'green';
    if (readyCondition.status === 'False') return 'red';
    return 'yellow';
  }
  
  const trueCondition = conditions.find(c => c.status === 'True');
  const falseCondition = conditions.find(c => c.status === 'False');
  if (trueCondition) return 'green';
  if (falseCondition) return 'red';
  
  return 'yellow';
};

export const getStatusText = (conditions, kind) => {
  if (!conditions || conditions.length === 0) return 'Unknown';
  
  if (kind === 'Provider') {
    const healthyCondition = conditions.find(c => c.type === 'Healthy');
    if (healthyCondition?.status === 'True') return 'Healthy';
    if (healthyCondition?.status === 'False') return 'Unhealthy';
    const installedCondition = conditions.find(c => c.type === 'Installed');
    if (installedCondition?.status === 'True') return 'Installed';
    return 'Pending';
  }
  
  const syncedCondition = conditions.find(c => c.type === 'Synced');
  const readyCondition = conditions.find(c => c.type === 'Ready');
  
  if (syncedCondition && readyCondition) {
    return null;
  }
  
  if (syncedCondition) {
    return syncedCondition.status === 'True' ? 'Synced' : 'Not Synced';
  }
  
  if (readyCondition) {
    return readyCondition.status === 'True' ? 'Ready' : 'Not Ready';
  }
  
  const trueCondition = conditions.find(c => c.status === 'True');
  const falseCondition = conditions.find(c => c.status === 'False');
  if (trueCondition) return 'Active';
  if (falseCondition) return 'Inactive';
  
  return 'Pending';
};

export const getSyncedStatus = (conditions) => {
  if (!conditions || conditions.length === 0) return null;
  const syncedCondition = conditions.find(c => c.type === 'Synced');
  if (!syncedCondition) return null;
  return {
    text: syncedCondition.status === 'True' ? 'Synced' : 'Not Synced',
    color: syncedCondition.status === 'True' ? 'green' : 'red'
  };
};

export const getReadyStatus = (conditions) => {
  if (!conditions || conditions.length === 0) return null;
  const readyCondition = conditions.find(c => c.type === 'Ready');
  if (!readyCondition) return null;
  return {
    text: readyCondition.status === 'True' ? 'Ready' : 'Not Ready',
    color: readyCondition.status === 'True' ? 'green' : (readyCondition.status === 'False' ? 'red' : 'yellow')
  };
};

export const getResponsiveStatus = (conditions) => {
  if (!conditions || conditions.length === 0) return null;
  const responsiveCondition = conditions.find(c => c.type === 'Responsive');
  if (!responsiveCondition) return null;
  return {
    text: responsiveCondition.status === 'True' ? 'Responsive' : 'Not Responsive',
    color: responsiveCondition.status === 'True' ? 'green' : (responsiveCondition.status === 'False' ? 'red' : 'yellow')
  };
};

