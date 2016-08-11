'use strict';

class HomeView extends BaseView {

  constructor() {
    super();

    this.title = "TourneyMan";
    this.template = "home";

    this.db = new PouchDB('events');

    this.model = {
      node_version: process.versions.node,
      chrome_version: process.versions.chrome,
      electron_version: process.versions.electron
    }

    this.menu = {
      "Create an Event": "create_event",
      "Player Registration": "list_players"
    }

    this.events = {
      "click": {
        ".event_details": (el) => this.onEventClicked(el),
        ".event_delete": (el) => this.onEventDeleteClicked(el),
        ".event_delete_confirm": (el) => this.onEventDeleteConfirmClicked(el)
      }
    }

    this.update_model();
  }

  update_model() {
    this.db.allDocs({include_docs: true}).then(
      (result) => {
        this.model.events = _.map(result.rows, (x) => x.doc);
        this.rebind_events();
        this.render();
      }
    ).catch(
      (err) => console.log(err)
    );
  }

  post_render() {
    let delete_confirm_modal = new Foundation.Reveal($("#deleteEventConfirm"), {});
  }

  onEventClicked(el) {
    let event_id = $(el.currentTarget).data('id');
    console.log("Event Clicked");
    console.log(event_id);

    router.navigate("event_detail", event_id);
  }

  onEventDeleteClicked(el) {
    let event_id = $(el.currentTarget).data('id');

    $(".event_delete_confirm").data('id', event_id);
    $("#deleteEventConfirm").foundation('open');
  }

  onEventDeleteConfirmClicked(el) {
    console.log("Clicked");
    let event_id = $(el.currentTarget).data('id');
    console.log(event_id);

    let self = this;

    this.db.get(event_id).then(function(doc) {
      return self.db.remove(doc);
    }).then(function (result) {
      console.log("Success");
      $("#deleteEventConfirm").foundation('close');
      self.update_model();
    }).catch(function (err) {
      console.log(err);
    });
  }
}
