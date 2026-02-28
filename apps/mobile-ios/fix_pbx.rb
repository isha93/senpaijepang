require 'xcodeproj'

project_path = 'SenpaiJepang.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Delete all existing EmptyStateView.swift references 
project.files.each do |file|
  if file.path == 'EmptyStateView.swift' || file.name == 'EmptyStateView.swift'
    file.remove_from_project
  end
end

project.save
puts "Wiped all EmptyStateView references."

# Re-add carefully
project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |t| t.name == 'SenpaiJepang' }
app_group = project.main_group.find_subpath('Sources/SenpaiJepangApp/Components/Molecules', true)

file_ref = app_group.new_file('EmptyStateView.swift')
app_target.source_build_phase.add_file_reference(file_ref, true)

project.save
puts "Re-added at correct path!"
