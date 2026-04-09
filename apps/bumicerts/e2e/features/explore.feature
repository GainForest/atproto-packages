Feature: Browse Bumicerts

  As a user
  I want to explore bumicerts and organizations
  So that I can learn about climate projects

  Background:
    Given the application is healthy

  Scenario: User views the explore page
    When the user navigates to "/explore"
    Then the page URL should contain "/explore"
    And the page should be loaded

  Scenario: User views the organizations list
    When the user navigates to "/organization/all"
    Then the page URL should contain "/organization/all"
    And the page should be loaded

  Scenario: User views the homepage
    When the user navigates to "/"
    Then the page should be loaded
    And the page URL should be "/"
