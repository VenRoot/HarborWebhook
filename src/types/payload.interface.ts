interface RootObject {
  type: string;
  occur_at: number;
  operator: string;
  event_data: Eventdata;
}

interface Eventdata {
  resources: Resource[];
  repository: Repository;
}

interface Repository {
  date_created: number;
  name: string;
  namespace: string;
  repo_full_name: string;
  repo_type: string;
}

interface Resource {
  digest: string;
  tag: string;
  resource_url: string;
}

export default RootObject;
export { Eventdata, Repository }