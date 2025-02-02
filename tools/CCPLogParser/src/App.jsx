/** ****************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  Licensed under the Apache License Version 2.0 (the 'License'). You may not
 *  use this file except in compliance with the License. A copy of the License
 *  is located at
 *
 *      http://www.apache.org/licenses/
 *  or in the 'license' file accompanying this file. This file is distributed on
 *  an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or
 *  implied. See the License for the specific language governing permissions and
 *  limitations under the License.
***************************************************************************** */

/* eslint-disable no-underscore-dangle */
// comment
import React, { createRef } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { NorthStarThemeProvider } from 'aws-northstar';
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import DescriptionIcon from '@material-ui/icons/Description';
// import FeedbackIcon from '@material-ui/icons/Feedback';
import './App.css';
// import pkg from '../package.json';
import EmptyView from './EmptyView';
import DraggingView from './DraggingView';
import LoadingView from './LoadingView';
import SnapshotListView from './SnapshotListView';
import LogView from './LogView';
import SkewMetricsView from './SkewMetricsView';
import ApiCallMetricsView from './ApiCallMetricsView';
import RtcMetricsViewGroup from './RtcMetricsViewGroup';

import {
    buildIndex, findExtras, resetIndex, hasSoftphoneMetrics, resetSoftphoneMetrics,
} from './utils/findExtras';

function TabPanel(props) {
    const {
        children, value, index, ...other
    } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...other}
        >
            {value === index && (
                <Container>
                    <Box>{children}</Box>
                </Container>
            )}
        </div>
    );
}
TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};
TabPanel.defaultProps = {
    children: [],
};

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

const styles = (theme) => ({
    root: {
        flexGrow: 1,
        backgroundColor: '#f5f5f5',
    },
    appbar: {
        backgroundColor: '#26303b',
    },
    title: {
        flexGrow: 1,
    },
    feedbackLink: {
        '& a': {
            display: 'inline-flex',
            verticalAlign: 'middle',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            borderColor: 'white',
            fontSize: '13px',
            marginLeft: '13px',
        },
        '& svg': {
            display: 'block',
        },
    },
    tab: {
        backgroundColor: '#2e3a48',
    },
    content: {
        zIndex: 2,
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
    },
    leftIcon: {
        marginRight: theme.spacing(1),
    },
    logo: {
        width: '10%',
    },
    rightIcon: {
        marginLeft: theme.spacing(1),
    },
});

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getInitialState();
        this.selectLog = this.selectLog.bind(this);
        this.selectSnapshots = this.selectSnapshots.bind(this);
        this.handleChangeTab = this.handleChangeTab.bind(this);
        this.handleOnDrop = this.handleOnDrop.bind(this);
        this.handleExpandLogView = this.handleExpandLogView.bind(this);
        this.dropzoneRef = createRef();

        if (window.File && window.FileReader && window.FileList && window.Blob) {
            // Great success! All the File APIs are supported.
        } else {
            // eslint-disable-next-line no-alert
            alert('The File APIs are not fully supported in this browser.');
        }
    }

    getInitialState() {
        return {
            tabIndex: 0,
            isInitial: true,
            isLoading: false,
            isExpanded: false,
            filename: null,
            log: [],
            selectedLog: [],
            selectedSnapshots: [],
            indexedLogs: null,
            hasRtcLog: false,
        };
    }

    handleOnDrop(files) {
        const allowedTypes = [
            'text/plain',
            'application/json',
        ];
        if (!allowedTypes.includes(files[0].type)) {
            // eslint-disable-next-line no-alert
            alert(`Error in processing ${files[0].name}: ${files[0].type} is not a supported file type.`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                resetIndex(); // rebuild the index for this file
                resetSoftphoneMetrics();// rebuild the SoftPhone metric for this file
                this.onLoadLog(JSON.parse(e.target.result));
            } catch (error) {
                // eslint-disable-next-line no-alert
                alert(`I failed to load the file ${files[0].name}: ${error}`);
            }
        };
        reader.onloadend = () => { this.setState({ isLoading: false }); };

        this.setState({ isLoading: true, filename: files[0].name });
        reader.readAsText(files[0]);
    }

    handleChangeTab(event, newValue) {
        this.setState({ tabIndex: newValue });
    }

    handleExpandLogView() {
        this.setState((prevState) => ({ isExpanded: !prevState.isExpanded }));
    }

    onLoadLog(log) {
        const rearrangedLog = log
            .map((event, idx) => (
                { ...event, _oriKey: idx, _ts: new Date(event.time).getTime() }
            ))
            .sort((a, b) => (a._ts === b._ts ? a._oriKey - b._oriKey : a._ts - b._ts))
            .map((event, idx) => findExtras(event, idx));

        const timeRange = [rearrangedLog[0]._ts, rearrangedLog[rearrangedLog.length - 1]._ts];

        this.setState({
            isInitial: false,
            // eslint-disable-next-line react/no-unused-state
            originalLog: log.map((event, idx) => ({ ...event, _oriKey: idx })),
            log: rearrangedLog,
            selectedLog: [],
            selectedSnapshots: [],
            indexedLogs: buildIndex(),
            hasRtcMetrics: hasSoftphoneMetrics(),
            timeRange,
        });
    }

    selectLog(selectedLog) {
        this.setState({ selectedLog });
    }

    selectSnapshots(selectedSnapshots) {
        this.setState({ selectedSnapshots });
    }

    render() {
        const {
            tabIndex,
            isInitial,
            isLoading,
            isExpanded,
            filename,
            log,
            selectedLog,
            selectedSnapshots,
            indexedLogs,
            hasRtcMetrics,
            timeRange,
        } = this.state;
        const { classes } = this.props;

        return (
            <NorthStarThemeProvider>
                <div className={classes.root}>
                    <Dropzone
                        ref={this.dropzoneRef}
                        disableClick
                        noClick
                        onDrop={this.handleOnDrop}
                    >
                        {({ getRootProps, isDragActive }) => (
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            <div {...getRootProps()}>
                                <AppBar position="static" className={classes.appbar}>
                                    <Toolbar variant="dense">
                                        <img src="https://patientsync-icons.s3.amazonaws.com/R3_PatientSync_Logo_Clr_Reversed_Horizontal.png" alt="logo" className={classes.logo} />
                                        <Typography variant="h6" color="inherit" className={classes.title}>
                                            { filename && (
                                                <span>
                                                    &nbsp;:&nbsp;
                                                    {filename}
                                                </span>
                                            ) }
                                        </Typography>
                                        <Typography color="inherit" className={classes.feedbackLink}>
                                            <Link
                                                href="https://github.com/amazon-connect/amazon-connect-snippets/blob/master/tools/CCPLogParser/README.md"
                                                target="_blank"
                                                rel="noopener"
                                                onClick={(e) => e.preventDefault}
                                            >
                                                <DescriptionIcon className={classes.leftIcon} />
                                                User Guide
                                            </Link>
                                        </Typography>
                                    </Toolbar>
                                    { (!isInitial && !isLoading) && (
                                        <Tabs className={classes.tab} value={tabIndex} onChange={this.handleChangeTab} centered aria-label="tabs">
                                            {/* eslint-disable-next-line max-len */}
                                            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
                                            <Tab label="Snapshots &amp; Logs" {...a11yProps(0)} />
                                            {/* eslint-disable-next-line max-len */}
                                            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
                                            <Tab label="Metrics" {...a11yProps(1)} />
                                        </Tabs>
                                    ) }
                                </AppBar>

                                { isDragActive && <DraggingView /> }

                                { (isInitial && !isLoading) && <EmptyView /> }
                                { isLoading && <LoadingView /> }
                                { (!isInitial && !isLoading) && (
                                    <>
                                        <TabPanel value={tabIndex} index={0}>
                                            <Container className={classes.content}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} md={3} style={isExpanded ? { display: 'none' } : {}}>
                                                        <SnapshotListView
                                                            log={log}
                                                            selected={selectedSnapshots}
                                                            selectLog={this.selectLog}
                                                            selectSnapshots={this.selectSnapshots}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} md={9} style={isExpanded ? { minWidth: '100%', maxWidth: '100%' } : {}}>
                                                        <LogView
                                                            log={log}
                                                            selected={selectedLog}
                                                            isExpanded={isExpanded}
                                                            expand={this.handleExpandLogView}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Container>
                                        </TabPanel>
                                        <TabPanel value={tabIndex} index={1}>
                                            <Container className={classes.content}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12}>
                                                        <SkewMetricsView
                                                            log={log}
                                                        />
                                                        <ApiCallMetricsView
                                                            log={log}
                                                            indexedLogs={indexedLogs}
                                                        />
                                                        { hasRtcMetrics && (
                                                            <RtcMetricsViewGroup
                                                                timeRange={timeRange}
                                                            />
                                                        )}
                                                    </Grid>
                                                </Grid>
                                            </Container>
                                        </TabPanel>
                                    </>
                                ) }
                            </div>
                        )}
                    </Dropzone>
                </div>
            </NorthStarThemeProvider>
        );
    }
}

App.propTypes = {
    classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
