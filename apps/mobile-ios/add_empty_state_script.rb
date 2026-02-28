require 'xcodeproj'

project_path = 'SenpaiJepang.xcodeproj'
project = Xcodeproj::Project.open(project_path)

app_target = project.targets.find { |t| t.name == 'SenpaiJepang' }

app_components_group = project.main_group.find_subpath('Sources/SenpaiJepangApp/Components/Molecules', true)
app_empty_state_ref = app_components_group.new_reference('EmptyStateView.swift')

app_target.source_build_phase.add_file_reference(app_empty_state_ref)

project.save
puts "Successfully added EmptyStateView.swift to SenpaiJepang target"
