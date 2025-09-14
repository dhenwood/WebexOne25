import xapi from 'xapi';

const minPeopleSpeakAudioLevel = 40 //decibel (dB)
const pollingInterval = 10000 // poll values in msec
var isSharingLocal = false // do not change

async function checkCallState() {
  xapi.Status.Call.get().then(callState => {
    if (callState != "") {
      updateLabel("inCallTextWidget", "In a call: Yes")
    } else {
      updateLabel("inCallTextWidget", "In a call: No")
    }
  })
}

async function checkContentShare() {
  await checkShareWired()
  await checkAirplay()
  await checkRemoteSharing()

  if (isSharingLocal == true) {
    updateLabel("sharingTextWidget", "Sharing Content: Yes")
  } else {
    updateLabel("sharingTextWidget", "Sharing Content: No")
  }

  isSharingLocal = false
}

async function checkShareWired() {
  await xapi.Status.Video.Input.Connector.get().then(contentState => {
    contentState.forEach(function(item) {
      var type = JSON.parse(item).Type
      var state = JSON.parse(item).Connected
      if (type == "USBC-DP" || type == "HDMI") {
        if (state == "True") {
          isSharingLocal = true
        }
      }
    })
  })
}

async function checkAirplay() {
  await xapi.Status.Video.Input.AirPlay.Activity.get().then(airplayState => {
    if (airplayState != "Idle") {
      isSharingLocal = true
    }
  }).catch(error => {
    //console.log("error: " + error.message)
  })
}

async function checkRemoteSharing() {
  await xapi.Status.Conference.Presentation.Mode.get().then(remoteShare => {
    if (remoteShare == "Receiving") {
      isSharingLocal = true
    }
  })
}

function checkAudioLevel() {
  xapi.Status.RoomAnalytics.Sound.Level.A.get().then(soundLevel => {
    console.log("polling sound: " + soundLevel)
    if (soundLevel > minPeopleSpeakAudioLevel) {
      var displayText = "People Speaking: Yes"
      updateLabel("peopleSpeakingTextWidget", displayText)
    } else {
      var displayText = "People Speaking: No"
      updateLabel("peopleSpeakingTextWidget", displayText)
    }
  })
}

function updateLabel(textLabel, value) {
  xapi.command("UserInterface Extensions Widget SetValue", {
    WidgetId: textLabel,
    Value: value
  })
}

function createPanel() {
  const xml = `
  <Extensions>
  <Version>1.11</Version>
  <Panel>
    <PanelId>currentStatePanel</PanelId>
    <Origin>local</Origin>
    <Location>RoomScheduler</Location>
    <Icon>Camera</Icon>
    <Name>Current State</Name>
    <ActivityType>Custom</ActivityType>
    <Page>
      <Name>Current State</Name>
      <Row>
        <Name>In Call</Name>
        <Widget>
          <WidgetId>inCallTextWidget</WidgetId>
          <Name>In a Call: No</Name>
          <Type>Text</Type>
          <Options>size=4;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Sharing Content</Name>
        <Widget>
          <WidgetId>sharingTextWidget</WidgetId>
          <Name>Sharing Content: No</Name>
          <Type>Text</Type>
          <Options>size=4;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>peopleSpeakingTextWidget</WidgetId>
          <Name>People Speaking: No</Name>
          <Type>Text</Type>
          <Options>size=4;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>widget_3</WidgetId>
          <Name>Information is refreshed every 10 seconds</Name>
          <Type>Text</Type>
          <Options>size=4;fontSize=small;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>refreshButton</WidgetId>
          <Name>Refresh Now</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
      </Row>
      <Options>hideRowNames=1</Options>
    </Page>
  </Panel>
</Extensions>
  `
  xapi.Command.UserInterface.Extensions.Panel.Save({
    PanelId: "currentState"
  }, xml);
}

function init() {
  createPanel();
  setInterval(checkAudioLevel, pollingInterval);
  setInterval(checkContentShare, pollingInterval);
  setInterval(checkCallState, pollingInterval);
}

init();
