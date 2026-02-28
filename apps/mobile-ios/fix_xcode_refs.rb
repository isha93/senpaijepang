require 'xcodeproj'

project_path = 'SenpaiJepang.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find and remove any broken root references
project.main_group.files.each do |file|
  if file.path == 'EmptyStateView.swift'
    file.remove_from_project
  end
end

app_target = project.targets.find { |t| t.name == 'SenpaiJepang' }
core_target = project.targets.find { |t| t.name == 'SenpaiMobileCore' }

app_group = project.main_group.find_subpath('Sources/SenpaiJepangApp/Components/Molecules', true)
core_group = project.main_group.find_subpath('Sources/SenpaiMobileCore/Components/Molecules', true)

# Create proper references 
unless app_group.files.find { |f| f.path == 'EmptyStateView.swift' }
  app_ref = app_group.new_file('EmptyStateView.swift')
  app_target.source_build_phase.add_file_reference(app_ref, true)
end

if core_target && core_group
  unless core_group.files.find { |f| f.path == 'EmptyStateView.swift' }
    core_ref = core_group.new_file('EmptyStateView.swift')
    core_target.source_build_phase.add_file_reference(core_ref, true)
  end
end

project.save
puts "Xcode references fixed!"
