import React from "react";
import { getFormValues, InjectedFormProps, reduxForm } from "redux-form";
import history from "utils/history";
import { SAAS_EDITOR_FORM } from "constants/forms";
import { Action, SaaSAction } from "entities/Action";
import { connect, useDispatch } from "react-redux";
import { AppState } from "reducers";
import {
  getPluginResponseTypes,
  getPluginDocumentationLinks,
  getAction,
  getPluginImages,
  getDatasourceByPluginId,
  getActionResponses,
  getPlugin,
} from "selectors/entitiesSelector";
import { RouteComponentProps } from "react-router";
import {
  deleteAction,
  runAction,
  setActionProperty,
} from "actions/pluginActionActions";
import {
  EditorJSONtoForm,
  EditorJSONtoFormProps,
} from "../QueryEditor/EditorJSONtoForm";
import { getConfigInitialValues } from "components/formControls/utils";
import { merge } from "lodash";
import { Datasource } from "entities/Datasource";
import {
  INTEGRATION_EDITOR_MODES,
  INTEGRATION_EDITOR_URL,
  INTEGRATION_TABS,
} from "constants/routes";
import { diff } from "deep-diff";

type StateAndRouteProps = EditorJSONtoFormProps & {
  difference?: any;
} & RouteComponentProps<{
    applicationId: string;
    pageId: string;
    pluginPackageName: string;
    apiId: string;
  }>;

type Props = StateAndRouteProps & InjectedFormProps<Action, StateAndRouteProps>;

function ActionForm(props: Props) {
  const {
    actionName,
    match: {
      params: { apiId, applicationId, pageId },
    },
  } = props;

  const dispatch = useDispatch();
  const onDeleteClick = () => {
    dispatch(deleteAction({ id: apiId, name: actionName }));
  };

  if (!!props.difference) {
    let path = "";
    let value = "";
    for (let i = 0; i < props.difference.length; i++) {
      if (props.difference[i]?.kind === "N") {
        path = props.difference[i].path.reduce(
          (acc: string, item: number | string) => {
            if (typeof item === "string" && acc) {
              acc += `${path}.${item}`;
            } else if (typeof item === "string" && !acc) {
              acc += `${item}`;
            } else acc += `${path}[${item}]`;
            return acc;
          },
          "",
        );
        value = props.difference[i]?.rhs;
      }
    }
    if (value && path) {
      dispatch(
        setActionProperty({
          actionId: apiId,
          propertyName: path,
          value: value,
        }),
      );
    }
  }

  const onRunClick = () => {
    dispatch(runAction(apiId));
  };
  const onCreateDatasourceClick = () => {
    history.push(
      INTEGRATION_EDITOR_URL(
        applicationId,
        pageId,
        INTEGRATION_TABS.NEW,
        INTEGRATION_EDITOR_MODES.AUTO,
      ),
    );
  };

  const childProps: any = {
    ...props,
    onRunClick,
    onDeleteClick,
    onCreateDatasourceClick,
  };
  return <EditorJSONtoForm {...childProps} />;
}

const mapStateToProps = (state: AppState, props: any) => {
  const { apiId } = props.match.params;
  const { runErrorMessage } = state.ui.queryPane;
  const { plugins } = state.entities;
  const { editorConfigs, settingConfigs } = plugins;
  const pluginImages = getPluginImages(state);

  const action = getAction(state, apiId);
  const actionName = action?.name ?? "";
  const pluginId = action?.pluginId ?? "";
  const plugin = getPlugin(state, pluginId);
  const responseTypes = getPluginResponseTypes(state);
  const documentationLinks = getPluginDocumentationLinks(state);
  let editorConfig: any;
  const initialValues = {};
  if (editorConfigs && pluginId) {
    editorConfig = editorConfigs[pluginId];
    if (editorConfig) {
      merge(initialValues, getConfigInitialValues(editorConfig));
    }
  }
  let settingConfig: any;

  if (settingConfigs && pluginId) {
    settingConfig = settingConfigs[pluginId];
  }
  merge(initialValues, getConfigInitialValues(settingConfig));
  merge(initialValues, action);
  const difference = diff(action, initialValues);
  const dataSources = getDatasourceByPluginId(state, pluginId);
  const DATASOURCES_OPTIONS = dataSources.map((dataSource: Datasource) => ({
    label: dataSource.name,
    value: dataSource.id,
    image: pluginImages[dataSource.pluginId],
  }));

  const responses = getActionResponses(state);
  return {
    isRunning: state.ui.queryPane.isRunning[apiId],
    isDeleting: state.ui.queryPane.isDeleting[apiId],
    editorConfig,
    settingConfig,
    actionName,
    pluginId,
    plugin,
    responseType: responseTypes[pluginId],
    formData: getFormValues(SAAS_EDITOR_FORM)(state) as SaaSAction,
    documentationLink: documentationLinks[pluginId],
    initialValues,
    dataSources,
    DATASOURCES_OPTIONS,
    executedQueryData: responses[apiId],
    runErrorMessage: runErrorMessage[apiId],
    formName: SAAS_EDITOR_FORM,
    difference,
  };
};

export default connect(mapStateToProps)(
  reduxForm<Action, StateAndRouteProps>({
    form: SAAS_EDITOR_FORM,
    enableReinitialize: true,
  })(ActionForm),
);
