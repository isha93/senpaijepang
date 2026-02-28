require 'xcodeproj'

project_path = 'SenpaiJepang.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Remove any file reference that points to the wrong root location
project.main_group.recursive_children.each do |child|
  if child.is_a?(Xcodeproj::Project::Object::PBXFileReference) && child.path == 'EmptyStateView.swift'
    # Check if its real path resolves to the project root
    if child.real_path.to_s.end_with?('apps/mobile-ios/EmptyStateView.swift')
      puts "Found offending ref! Removing: #{child.real_path}"
      child.remove_from_project
    end
  end
end

project.save
puts "Fixed!"
