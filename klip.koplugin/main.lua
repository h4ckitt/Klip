local DataStorage = require("datastorage")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")
local InputDialog = require("ui/widget/inputdialog")
local FileChooser = require("ui/widget/filechooser")
local JSON = require("json")
local logger = require("logger")
local util = require("util")
local _ = require("gettext")
local ffi = require("ffi/util")
local T = ffi.template
local lfs = require("libs/libkoreader-lfs")

local plugin_path = DataStorage:getFullDataDir() .. "/plugins/klip.koplugin"
local binary_path_relative_to_plugin_path = "klip/klip"

if not util.pathExists(ffi.joinPath(plugin_path, binary_path_relative_to_plugin_path)) then
	logger.warn("Klip: Binary not found at " .. binary_path_relative_to_plugin_path)
	return { disabled = true }
end

local FolderPicker = FileChooser:extend{
	show_hidden = false,
	is_borderless = true,
	title = "Select Download Folder",
	mode = "dir",
}

function FolderPicker:show_file(filename)
	return false
end

function FolderPicker:genItemTableFromPath(path)
	local items = FileChooser.genItemTableFromPath(self, path)

	table.insert(items, 1, {
		text = "Select this folder",
		bold = true,
		is_file = true,
		path = path .. "/.",
		_select_current = true,
	})

	return items
end

function FolderPicker:onFileSelect(item)
	if item._select_current then
		if self.onChoose then self.onChoose(self.path) end
		UIManager:close(self)
		return true
	end
	return FileChooser.onFileSelect(self, item)
end

local Klip = WidgetContainer:extend{
	name = "klip",
	title = "Klip Sync",
}

function Klip:init()
	self.config_file = T("%1/config.json", ffi.joinPath(plugin_path, "klip"))
	self:loadConfig()
	self.ui.menu:registerToMainMenu(self)
	logger.info("Klip: Initialized")
end

function Klip:addToMainMenu(menu_items)
	menu_items.klip = {
		text = "Klip Sync",
		sorting_hint = 2,
		sub_item_table = {
			{
				text = _("Sync Now"),
				bold = true,
				keep_menu_open = true,
				callback = function(touchmenu_instance)
					self:onSync(touchmenu_instance)
				end,
			},
			{
				text_func = function() return T(_("Server URL: %1"), (self.config.server_url or "")) end,
				keep_menu_open = true,
				callback = function(touchmenu_instance)
					self:promptServerUrl(touchmenu_instance)
				end,
			},
			{
				text_func = function() return T(_("Download Folder: %1"), (self.config.download_path or "")) end,
				keep_menu_open = true,
				callback = function(touchmenu_instance)
					self:promptDownloadFolder(touchmenu_instance)
				end,
			},
		},
	}
end

function Klip:onSync(touchmenu_instance)
	local info = InfoMessage:new{
		text = "Syncing with Server...",
		icon = "network",
	}
	UIManager:show(info)
	UIManager:forceRePaint()

	local cmd = string.format("cd %s && ./%s > /dev/null 2>&1", plugin_path, binary_path_relative_to_plugin_path)
	logger.info("Klip: Executing " .. cmd)

	local result = os.execute(cmd)
	local success = (result == 0)

	logger.info("Klip: os.execute returned " .. tostring(result))

	UIManager:close(info)

	if success then
		UIManager:show(InfoMessage:new{ text = "Sync Complete", timeout = 2 })
		if self.ui and self.ui.file_manager then
			self.ui.file_manager:reinit()
		end
	else
		UIManager:show(InfoMessage:new{ text = "Sync Failed\nCheck crash.log", timeout = 3 })
	end

	if touchmenu_instance and touchmenu_instance.updateItems then
		touchmenu_instance:updateItems()
	end
end

function Klip:promptServerUrl(touchmenu_instance)
	self.server_url_dialog = InputDialog:new{
		title = _("Enter Klip Server URL"),
		input = self.config.server_url,
		buttons = {
			{
				{
					text = _("Cancel"),
					id = "close",
					callback = function() UIManager:close(self.server_url_dialog) end
				},
				{
					text = _("Save"),
					is_enter_default = true,
					callback = function()
						local value = self.server_url_dialog:getInputText()
						if value ~= "" and not value:find("^https?://") then
							value = "http://" .. value
						end
						self.config.server_url = value
						self:saveConfig()
						if touchmenu_instance and touchmenu_instance.updateItems then
							touchmenu_instance:updateItems()
						end
						UIManager:close(self.server_url_dialog)
					end,
				},
			}
		},
	}
	UIManager:show(self.server_url_dialog)
	self.server_url_dialog:onShowKeyboard()
end

function Klip:promptDownloadFolder(touchmenu_instance)
	local start_path = self.config.download_path
	if not lfs.attributes(start_path) then start_path = "/mnt/us/documents" end

	-- Instantiate our Custom FolderPicker
	local picker = FolderPicker:new{
		path = start_path,
		onChoose = function(new_path)
			self.config.download_path = new_path
			self:saveConfig()
			if touchmenu_instance and touchmenu_instance.updateItems then
				touchmenu_instance:updateItems()
			end
		end,
	}
	UIManager:show(picker)
end

function Klip:loadConfig()
	self.config = {
		server_url = "http://192.168.1.50:3000",
		download_path = "/mnt/us/documents/Klip",
	}

	local f = io.open(self.config_file, "r")
	if f then
		local content = f:read("*all")
		f:close()
		if content and content ~= "" then
			local ok, decoded = pcall(JSON.decode, content)
			if ok and type(decoded) == "table" then
				for k, v in pairs(decoded) do
					self.config[k] = v
				end
			end
		end
	else
		self:saveConfig()
	end
end

function Klip:saveConfig()
	local f = io.open(self.config_file, "w")
	if f then
		f:write(JSON.encode(self.config))
		f:close()
	end
end

return Klip
