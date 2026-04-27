export interface TaskHistory {
  _id: string;
  taskId: string;
  taskDesc: string;
  field: string;
  oldVal: string;
  newVal: string;
  changedBy: string;
  remark: string;
  createdAt: string;
}
