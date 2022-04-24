import { NotionData } from '../helpers/useNotionData';

interface WorkspaceHeaderProps {
  notionData: NotionData;
}

export default function WorkSpaceHeader(props: WorkspaceHeaderProps) {
  const { notionData } = props;
  const { workSpace, connectionLink } = notionData;

  return (
    <div className="container content mt-2 mb-0 is-flex is-justify-content-center">
      <nav className="level">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5">
              <span className="tag is-info">workspace</span>
              <header>
                <h1>{workSpace}</h1>
              </header>
            </p>
          </div>
          <div className="level-item">
            <div className="field is-grouped">
              <p className="control">
                <a href={connectionLink} className="button">
                  Switch
                </a>
              </p>
              <p className="control">
                <a href="/settings" className="button">
                  Settings
                </a>
              </p>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
