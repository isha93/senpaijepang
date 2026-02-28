require 'xcodeproj'

project_path = 'SenpaiJepang.xcodeproj'
project = Xcodeproj::Project.open(project_path)

app_target = project.targets.find { |t| t.name == 'SenpaiJepang' }
core_target = project.targets.find { |t| t.name == 'SenpaiMobileCore' }

# 1. Add app app EmptyStateView properly
app_group = project.main_group.find_subpath('Sources/SenpaiJepangApp/Components/Molecules', true)
existing_app_ref = app_group.files.find { |f| f.path == 'EmptyStateView.swift' }

if existing_app_ref.nil?
  new_app_ref = app_group.new_file('EmptyStateView.swift')
  app_target.source_build_phase.add_file_reference(new_app_ref, true)
elsif !app_target.source_build_phase.files.find { |f| f.file_ref == existing_app_ref }
  app_target.source_build_phase.add_file_reference(existing_app_ref, true)
end

# 2. Add Core EmptyStateView properly
if !core_target.nil?
  core_group = project.main_group.find_subpath('Sources/SenpaiMobileCore/Components/Molecules', true)
  existing_core_ref = core_group.files.find { |f| f.path == 'EmptyStateView.swift' }

  if existing_core_ref.nil?
    new_core_ref = core_group.new_file('EmptyStateView.swift')
    core_target.source_build_phase.add_file_reference(new_core_ref, true)
  elsif !core_target.source_build_phase.files.find { |f| f.file_ref == existing_core_ref }
    core_target.source_build_phase.add_file_reference(existing_core_ref, true)
  end
end

project.save
puts "Added successfully"
