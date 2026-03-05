const BasePage = require('./Base.page');

class ProfilePage extends BasePage {
  get headerName() { return $('~profile_header_name'); }
  get editButton() { return $('~profile_edit_button'); }
  get logoutButton() { return $('~profile_logout_button'); }
}

module.exports = new ProfilePage();
